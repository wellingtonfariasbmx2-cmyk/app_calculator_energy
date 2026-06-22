-- Este script força O RLS a fechar todas as brechas em todas as pontas
-- Se mesmo apagando o offline cache eles aparecem, o banco está ignorando o RLS.

-- 1. Garante que as funções de autenticação funcionam e não caem em bypass (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 2. Limpa QUALQUER política antiga que tenha o maldito "IS NULL"
DROP POLICY IF EXISTS "Users view company equipments" ON equipments;
DROP POLICY IF EXISTS "Users view company events" ON events;
DROP POLICY IF EXISTS "Users view company calculations" ON calculations;
DROP POLICY IF EXISTS "Users view company allocations" ON equipment_allocations;
DROP POLICY IF EXISTS "Users view company maintenance" ON maintenance_records;

-- 3. Cria ESTRITAMENTE igualando ao `get_my_company_id()`
CREATE POLICY "Users view company equipments" ON equipments FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "Users view company events" ON events FOR SELECT USING (company_id = get_my_company_id());
CREATE POLICY "Users view company calculations" ON calculations FOR SELECT USING (company_id = get_my_company_id());

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    CREATE POLICY "Users view company allocations" ON equipment_allocations FOR SELECT USING (company_id = get_my_company_id());
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    CREATE POLICY "Users view company maintenance" ON maintenance_records FOR SELECT USING (company_id = get_my_company_id());
  END IF;
END $$;

-- 4. O mais importante: Força que novos dados sempre venham com a empresa certa e NUNCA Nulos
ALTER TABLE equipments ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE events ALTER COLUMN company_id SET NOT NULL;
ALTER TABLE calculations ALTER COLUMN company_id SET NOT NULL;
