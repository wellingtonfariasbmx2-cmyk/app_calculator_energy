-- FIX_RECURSION_AND_ENABLE_RLS.sql
-- Restaura a propriedade SECURITY DEFINER na função.
-- Isso faz a função rodar com privilégios de Admin e quebra o loop infinito ("stack depth limit exceeded").
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- GARANTE ABSOLUTAMENTE QUE TODAS AS TABELAS TEM ROW LEVEL SECURITY (RLS) LIGADO
-- Se o usuário não tiver rodado o script 007 anteriormente, os dados ficavam públicos.
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
