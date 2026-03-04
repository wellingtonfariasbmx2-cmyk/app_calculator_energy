-- ============================================
-- MIGRAÇÃO: Sistema Multi-Tenant e Perfis
-- ============================================

-- 1. Criação da tabela companies
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    logo_url TEXT,
    theme TEXT DEFAULT 'dark',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criação da tabela profiles
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'employee')),
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Function and trigger to update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. Adiciona company_id nas tabelas existentes
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipments' AND column_name = 'company_id') THEN
    ALTER TABLE equipments ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'company_id') THEN
    ALTER TABLE events ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'calculations' AND column_name = 'company_id') THEN
    ALTER TABLE calculations ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'maintenance_records' AND column_name = 'company_id') THEN
      ALTER TABLE maintenance_records ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_allocations' AND column_name = 'company_id') THEN
      ALTER TABLE equipment_allocations ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE CASCADE;
    END IF;
  END IF;
END $$;

-- 4. Popular DB com empresa padrão para usuários existentes
DO $$ 
DECLARE
    r RECORD;
    new_company_id UUID;
    first_company_id UUID := NULL;
BEGIN
    FOR r IN SELECT id, email FROM auth.users WHERE id NOT IN (SELECT id FROM public.profiles) LOOP
        INSERT INTO public.companies (name) VALUES ('Sua Empresa') RETURNING id INTO new_company_id;
        
        IF first_company_id IS NULL THEN
            first_company_id := new_company_id;
        END IF;

        INSERT INTO public.profiles (id, company_id, role, email) VALUES (r.id, new_company_id, 'owner', r.email);
    END LOOP;

    -- Atribuir todos os registros antigos à primeira empresa criada
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

-- 5. Trigger para novos usuários
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  INSERT INTO public.companies (name)
  VALUES ('Sua Empresa')
  RETURNING id INTO new_company_id;

  INSERT INTO public.profiles (id, company_id, role, email)
  VALUES (new.id, new_company_id, 'owner', new.email);
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 6. Recriar View de Disponibilidade considerando APENAS eventos correntes
DROP VIEW IF EXISTS equipment_availability;
CREATE OR REPLACE VIEW equipment_availability AS
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
LEFT JOIN events ev ON ea.event_id = ev.id
GROUP BY e.id, e.company_id, e.name, e.quantity_owned;

-- 7. RLS Atualizadas
-- Habilitar RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user company_id
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Companies
DROP POLICY IF EXISTS "Users view own company" ON companies;
CREATE POLICY "Users view own company" ON companies FOR SELECT USING (id = get_my_company_id());
DROP POLICY IF EXISTS "Users update own company" ON companies;
CREATE POLICY "Users update own company" ON companies FOR UPDATE USING (id = get_my_company_id());

-- Profiles
DROP POLICY IF EXISTS "Users view company profiles" ON profiles;
CREATE POLICY "Users view company profiles" ON profiles FOR SELECT USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users update own profile" ON profiles;
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id OR ('owner' = (SELECT role FROM profiles WHERE profiles.id = auth.uid()) AND company_id = get_my_company_id()));

-- Equipments
DROP POLICY IF EXISTS "Users view company equipments" ON equipments;
CREATE POLICY "Users view company equipments" ON equipments FOR SELECT USING (company_id = get_my_company_id() OR company_id IS NULL);
DROP POLICY IF EXISTS "Users insert company equipments" ON equipments;
CREATE POLICY "Users insert company equipments" ON equipments FOR INSERT WITH CHECK (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users update company equipments" ON equipments;
CREATE POLICY "Users update company equipments" ON equipments FOR UPDATE USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users delete company equipments" ON equipments;
CREATE POLICY "Users delete company equipments" ON equipments FOR DELETE USING (company_id = get_my_company_id());

-- Events
DROP POLICY IF EXISTS "Users view company events" ON events;
CREATE POLICY "Users view company events" ON events FOR SELECT USING (company_id = get_my_company_id() OR company_id IS NULL);
DROP POLICY IF EXISTS "Users insert company events" ON events;
CREATE POLICY "Users insert company events" ON events FOR INSERT WITH CHECK (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users update company events" ON events;
CREATE POLICY "Users update company events" ON events FOR UPDATE USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users delete company events" ON events;
CREATE POLICY "Users delete company events" ON events FOR DELETE USING (company_id = get_my_company_id());

-- Calculations
DROP POLICY IF EXISTS "Users view company calculations" ON calculations;
CREATE POLICY "Users view company calculations" ON calculations FOR SELECT USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users insert company calculations" ON calculations;
CREATE POLICY "Users insert company calculations" ON calculations FOR INSERT WITH CHECK (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users update company calculations" ON calculations;
CREATE POLICY "Users update company calculations" ON calculations FOR UPDATE USING (company_id = get_my_company_id());
DROP POLICY IF EXISTS "Users delete company calculations" ON calculations;
CREATE POLICY "Users delete company calculations" ON calculations FOR DELETE USING (company_id = get_my_company_id());

-- Allocations & Maintenance
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users view company allocations" ON equipment_allocations';
    EXECUTE 'CREATE POLICY "Users view company allocations" ON equipment_allocations FOR SELECT USING (company_id = get_my_company_id())';
    EXECUTE 'DROP POLICY IF EXISTS "Users insert company allocations" ON equipment_allocations';
    EXECUTE 'CREATE POLICY "Users insert company allocations" ON equipment_allocations FOR INSERT WITH CHECK (company_id = get_my_company_id())';
    EXECUTE 'DROP POLICY IF EXISTS "Users update company allocations" ON equipment_allocations';
    EXECUTE 'CREATE POLICY "Users update company allocations" ON equipment_allocations FOR UPDATE USING (company_id = get_my_company_id())';
    EXECUTE 'DROP POLICY IF EXISTS "Users delete company allocations" ON equipment_allocations';
    EXECUTE 'CREATE POLICY "Users delete company allocations" ON equipment_allocations FOR DELETE USING (company_id = get_my_company_id())';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Users view company maintenance" ON maintenance_records';
    EXECUTE 'CREATE POLICY "Users view company maintenance" ON maintenance_records FOR SELECT USING (company_id = get_my_company_id())';
    EXECUTE 'DROP POLICY IF EXISTS "Users insert company maintenance" ON maintenance_records';
    EXECUTE 'CREATE POLICY "Users insert company maintenance" ON maintenance_records FOR INSERT WITH CHECK (company_id = get_my_company_id())';
    EXECUTE 'DROP POLICY IF EXISTS "Users update company maintenance" ON maintenance_records';
    EXECUTE 'CREATE POLICY "Users update company maintenance" ON maintenance_records FOR UPDATE USING (company_id = get_my_company_id())';
    EXECUTE 'DROP POLICY IF EXISTS "Users delete company maintenance" ON maintenance_records';
    EXECUTE 'CREATE POLICY "Users delete company maintenance" ON maintenance_records FOR DELETE USING (company_id = get_my_company_id())';
  END IF;
END $$;
