-- ROLLBACK: SINGLE TENANT ARCHITECTURE
-- Script para reverter o sistema para exclusividade de um único dono.

-- 1. Remover Dependências e Views que usam company_id
DROP VIEW IF EXISTS equipment_availability;

-- 2. Limpar Políticas de Segurança (Estavam bloqueando no modelo multi-empresa)
DROP POLICY IF EXISTS "Users view company equipments" ON equipments;
DROP POLICY IF EXISTS "Users insert company equipments" ON equipments;
DROP POLICY IF EXISTS "Users update company equipments" ON equipments;
DROP POLICY IF EXISTS "Users delete company equipments" ON equipments;

DROP POLICY IF EXISTS "Users view company events" ON events;
DROP POLICY IF EXISTS "Users insert company events" ON events;
DROP POLICY IF EXISTS "Users update company events" ON events;
DROP POLICY IF EXISTS "Users delete company events" ON events;

DROP POLICY IF EXISTS "Users view company calculations" ON calculations;
DROP POLICY IF EXISTS "Users insert company calculations" ON calculations;
DROP POLICY IF EXISTS "Users update company calculations" ON calculations;
DROP POLICY IF EXISTS "Users delete company calculations" ON calculations;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    DROP POLICY IF EXISTS "Users view company allocations" ON equipment_allocations;
    DROP POLICY IF EXISTS "Users insert company allocations" ON equipment_allocations;
    DROP POLICY IF EXISTS "Users update company allocations" ON equipment_allocations;
    DROP POLICY IF EXISTS "Users delete company allocations" ON equipment_allocations;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    DROP POLICY IF EXISTS "Users view company maintenance" ON maintenance_records;
    DROP POLICY IF EXISTS "Users insert company maintenance" ON maintenance_records;
    DROP POLICY IF EXISTS "Users update company maintenance" ON maintenance_records;
    DROP POLICY IF EXISTS "Users delete company maintenance" ON maintenance_records;
  END IF;
END $$;

-- 3. Remover a exigência de ser NOT NULL (pois a coluna será dropada)
ALTER TABLE equipments ALTER COLUMN company_id DROP DEFAULT;
ALTER TABLE equipments ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE events ALTER COLUMN company_id DROP DEFAULT;
ALTER TABLE events ALTER COLUMN company_id DROP NOT NULL;

ALTER TABLE calculations ALTER COLUMN company_id DROP DEFAULT;
ALTER TABLE calculations ALTER COLUMN company_id DROP NOT NULL;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    ALTER TABLE equipment_allocations ALTER COLUMN company_id DROP DEFAULT;
    ALTER TABLE equipment_allocations ALTER COLUMN company_id DROP NOT NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    ALTER TABLE maintenance_records ALTER COLUMN company_id DROP DEFAULT;
    ALTER TABLE maintenance_records ALTER COLUMN company_id DROP NOT NULL;
  END IF;
END $$;

-- 4. Remover colunas company_id de todas as tabelas e referências ForeignKey, usando CASCADE para ignorar políticas presas
ALTER TABLE equipments DROP COLUMN IF EXISTS company_id CASCADE;
ALTER TABLE events DROP COLUMN IF EXISTS company_id CASCADE;
ALTER TABLE calculations DROP COLUMN IF EXISTS company_id CASCADE;
ALTER TABLE profiles DROP COLUMN IF EXISTS company_id CASCADE;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    ALTER TABLE equipment_allocations DROP COLUMN IF EXISTS company_id CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    ALTER TABLE maintenance_records DROP COLUMN IF EXISTS company_id CASCADE;
  END IF;
END $$;

-- 5. Destruir tabela de empresas e funções extras
DROP TABLE IF EXISTS companies CASCADE;
DROP FUNCTION IF EXISTS get_company_public_info(uuid);
DROP FUNCTION IF EXISTS get_my_company_id();

-- 6. Recriar View original de Disponibilidade SEM restrições de empresa
-- e sem security_invoker (pois agora o sistema é monousuário novamente)
CREATE VIEW equipment_availability AS
SELECT 
  e.id,
  e.name,
  e.quantity_owned,
  COALESCE(SUM(
    CASE 
      WHEN ea.status = 'allocated' 
      AND ev.status IN ('planned', 'in_progress')
      AND CURRENT_DATE >= DATE(ev.start_date) 
      AND CURRENT_DATE <= DATE(ev.end_date)
      THEN ea.quantity_allocated 
      ELSE 0 
    END
  ), 0) as quantity_allocated,
  e.quantity_owned - COALESCE(SUM(
    CASE 
      WHEN ea.status = 'allocated' 
      AND ev.status IN ('planned', 'in_progress')
      AND CURRENT_DATE >= DATE(ev.start_date) 
      AND CURRENT_DATE <= DATE(ev.end_date)
      THEN ea.quantity_allocated 
      ELSE 0 
    END
  ), 0) as quantity_available
FROM equipments e
LEFT JOIN equipment_allocations ea ON e.id = ea.equipment_id AND ea.status = 'allocated'
LEFT JOIN events ev ON ea.event_id = ev.id AND ev.status IN ('planned', 'in_progress') 
                      AND CURRENT_DATE >= DATE(ev.start_date) 
                      AND CURRENT_DATE <= DATE(ev.end_date)
GROUP BY e.id, e.name, e.quantity_owned;

-- 7. Desativar RLS definitivamente (Como antes, o controle será apenas por autenticação global via frontend / API Token)
ALTER TABLE equipments DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE calculations DISABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    ALTER TABLE equipment_allocations DISABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    ALTER TABLE maintenance_records DISABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- FIM DO SCRIPT
