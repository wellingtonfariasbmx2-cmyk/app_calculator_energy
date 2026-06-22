-- Migração: Fechando a brecha de segurança (RLS Strict Mode)
-- As políticas de visualização originais permitiam "OR company_id IS NULL"
-- para evitar perda de dados durante a transição. Agora que o sistema está em produção multi-tenant,
-- isso causa vazamento de dados antigos (sem empresa) para todas as empresas novas.

-- 1. Atribuir os dados órfãos à primeira empresa do sistema para que não fiquem num limbo
DO $$ 
DECLARE
    first_company_id UUID;
BEGIN
    SELECT id INTO first_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        UPDATE equipments SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE events SET company_id = first_company_id WHERE company_id IS NULL;
        UPDATE calculations SET company_id = first_company_id WHERE company_id IS NULL;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
            UPDATE maintenance_records SET company_id = first_company_id WHERE company_id IS NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
            UPDATE equipment_allocations SET company_id = first_company_id WHERE company_id IS NULL;
        END IF;
    END IF;
END $$;

-- 2. Recriar as Políticas de Visualização de FORMA ESTRITA (Remove the "OR company_id IS NULL")

-- Equipments
DROP POLICY IF EXISTS "Users view company equipments" ON equipments;
CREATE POLICY "Users view company equipments" ON equipments FOR SELECT USING (company_id = get_my_company_id());

-- Events
DROP POLICY IF EXISTS "Users view company events" ON events;
CREATE POLICY "Users view company events" ON events FOR SELECT USING (company_id = get_my_company_id());
