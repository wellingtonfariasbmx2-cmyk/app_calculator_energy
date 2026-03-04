-- Migração: Ativando a barreira de Segurança a Nível de Linha (RLS) para todas as tabelas operacionais.
-- Sem isso, o banco de dados ignora as políticas criadas anteriormente e permite acesso global.

ALTER TABLE equipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE calculations ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_allocations') THEN
    ALTER TABLE equipment_allocations ENABLE ROW LEVEL SECURITY;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;
