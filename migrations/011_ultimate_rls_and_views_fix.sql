-- SCRIPT DEFINITIVO DE ISOLAMENTO DE EMPRESAS (MULTI-TENANT)
-- Este script resolve todos os problemas de dados vazados e erros em cascata.

-- 1. Garante que `get_my_company_id()` existe e é veloz
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Limpeza de dados nulos/fantasmas (para todas as tabelas)
DO $$ 
DECLARE
    first_company_id UUID;
BEGIN
    -- Pega a conta original (Sua Empresa primária)
    SELECT id INTO first_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        -- Atualiza TUDO que estiver nulo para a empresa original
        UPDATE equipments SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE events SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE calculations SET company_id = first_company_id WHERE company_id IS NULL;
        
        -- Segurança contra tabelas faltantes
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
            -- Se a coluna existir
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_allocations' AND column_name = 'company_id') THEN
                UPDATE equipment_allocations SET company_id = first_company_id WHERE company_id IS NULL;
            -- Se não existir, a criamos agora antes que quebre tudo
            ELSE
                ALTER TABLE equipment_allocations ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
                UPDATE equipment_allocations SET company_id = first_company_id;
            END IF;
        END IF;

        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
            IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'company_id') THEN
                UPDATE maintenance_records SET company_id = first_company_id WHERE company_id IS NULL;
            ELSE
                ALTER TABLE maintenance_records ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
                UPDATE maintenance_records SET company_id = first_company_id;
            END IF;
        END IF;
    END IF;
END $$;

-- 3. Agora que nada é nulo, trancamos a porta: tudo será NOT NULL e com DEFAULT automático
ALTER TABLE equipments ALTER COLUMN company_id SET DEFAULT public.get_my_company_id();
ALTER TABLE equipments ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE events ALTER COLUMN company_id SET DEFAULT public.get_my_company_id();
ALTER TABLE events ALTER COLUMN company_id SET NOT NULL;

ALTER TABLE calculations ALTER COLUMN company_id SET DEFAULT public.get_my_company_id();
ALTER TABLE calculations ALTER COLUMN company_id SET NOT NULL;

-- Allocations & Maintenance
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
        ALTER TABLE equipment_allocations ALTER COLUMN company_id SET DEFAULT public.get_my_company_id();
        ALTER TABLE equipment_allocations ALTER COLUMN company_id SET NOT NULL;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
        ALTER TABLE maintenance_records ALTER COLUMN company_id SET DEFAULT public.get_my_company_id();
        ALTER TABLE maintenance_records ALTER COLUMN company_id SET NOT NULL;
    END IF;
END $$;

-- 4. O CULPADO DO VAZAMENTO: A View `equipment_availability`!
-- Views no PostgreSQL "pulam" o RLS por padrão. Precisamos ativá-lo com `security_invoker = true`
DROP VIEW IF EXISTS equipment_availability;
CREATE VIEW equipment_availability WITH (security_invoker = true) AS
SELECT 
  e.id,
  e.company_id,
  e.name,
  e.quantity_owned,
  -- quantidade alocada AGORA (eventos atuais)
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
  -- quantidade disponível na prateleira HOJE
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
GROUP BY e.id, e.company_id, e.name, e.quantity_owned;

-- 5. Recriação ESTRITA e indestrutível das políticas RLS
-- Equipments
DROP POLICY IF EXISTS "Users view company equipments" ON equipments;
DROP POLICY IF EXISTS "Users insert company equipments" ON equipments;
DROP POLICY IF EXISTS "Users update company equipments" ON equipments;
DROP POLICY IF EXISTS "Users delete company equipments" ON equipments;
CREATE POLICY "Users view company equipments" ON equipments FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "Users insert company equipments" ON equipments FOR INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "Users update company equipments" ON equipments FOR UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "Users delete company equipments" ON equipments FOR DELETE USING (company_id = get_my_company_id());

-- Events
DROP POLICY IF EXISTS "Users view company events" ON events;
DROP POLICY IF EXISTS "Users insert company events" ON events;
DROP POLICY IF EXISTS "Users update company events" ON events;
DROP POLICY IF EXISTS "Users delete company events" ON events;
CREATE POLICY "Users view company events" ON events FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "Users insert company events" ON events FOR INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "Users update company events" ON events FOR UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "Users delete company events" ON events FOR DELETE USING (company_id = get_my_company_id());

-- Calculations
DROP POLICY IF EXISTS "Users view company calculations" ON calculations;
DROP POLICY IF EXISTS "Users insert company calculations" ON calculations;
DROP POLICY IF EXISTS "Users update company calculations" ON calculations;
DROP POLICY IF EXISTS "Users delete company calculations" ON calculations;
CREATE POLICY "Users view company calculations" ON calculations FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "Users insert company calculations" ON calculations FOR INSERT WITH CHECK (company_id = get_my_company_id());
CREATE POLICY "Users update company calculations" ON calculations FOR UPDATE USING (company_id = get_my_company_id());
CREATE POLICY "Users delete company calculations" ON calculations FOR DELETE USING (company_id = get_my_company_id());

-- Allocations & Maintenance
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    DROP POLICY IF EXISTS "Users view company allocations" ON equipment_allocations;
    DROP POLICY IF EXISTS "Users insert company allocations" ON equipment_allocations;
    DROP POLICY IF EXISTS "Users update company allocations" ON equipment_allocations;
    DROP POLICY IF EXISTS "Users delete company allocations" ON equipment_allocations;
    CREATE POLICY "Users view company allocations" ON equipment_allocations FOR SELECT USING (company_id = get_my_company_id());
    CREATE POLICY "Users insert company allocations" ON equipment_allocations FOR INSERT WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "Users update company allocations" ON equipment_allocations FOR UPDATE USING (company_id = get_my_company_id());
    CREATE POLICY "Users delete company allocations" ON equipment_allocations FOR DELETE USING (company_id = get_my_company_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    DROP POLICY IF EXISTS "Users view company maintenance" ON maintenance_records;
    DROP POLICY IF EXISTS "Users insert company maintenance" ON maintenance_records;
    DROP POLICY IF EXISTS "Users update company maintenance" ON maintenance_records;
    DROP POLICY IF EXISTS "Users delete company maintenance" ON maintenance_records;
    CREATE POLICY "Users view company maintenance" ON maintenance_records FOR SELECT USING (company_id = get_my_company_id());
    CREATE POLICY "Users insert company maintenance" ON maintenance_records FOR INSERT WITH CHECK (company_id = get_my_company_id());
    CREATE POLICY "Users update company maintenance" ON maintenance_records FOR UPDATE USING (company_id = get_my_company_id());
    CREATE POLICY "Users delete company maintenance" ON maintenance_records FOR DELETE USING (company_id = get_my_company_id());
  END IF;
END $$;
