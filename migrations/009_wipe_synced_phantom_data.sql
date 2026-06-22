-- Limpeza de Dados Fantasmas
-- Este script limpa equipamentos, eventos e cálculos criados *por engano* via cache local para NOVAS contas.
-- Como critério seguro, deixaremos intocados todos os registros vinculados à primeira empresa (Dono Principal)
-- e deletaremos os dados acidentais das outras empresas (as novas) recém-criadas.

DO $$ 
DECLARE
    first_company_id UUID;
BEGIN
    -- Identifica a empresa principal (a mais antiga)
    SELECT id INTO first_company_id FROM public.companies ORDER BY created_at ASC LIMIT 1;
    
    IF first_company_id IS NOT NULL THEN
        -- Exclui das EMPRESAS NOVAS (Tudo que for diferente da primeira empresa)
        DELETE FROM equipments WHERE company_id != first_company_id;
        DELETE FROM events WHERE company_id != first_company_id;
        DELETE FROM calculations WHERE company_id != first_company_id;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
            DELETE FROM equipment_allocations WHERE company_id != first_company_id;
        END IF;
        
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
            DELETE FROM maintenance_records WHERE company_id != first_company_id;
        END IF;
    END IF;
END $$;
