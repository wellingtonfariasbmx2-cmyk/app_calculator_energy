-- Migration: Tabela de Materiais
-- Descrição: Cria a tabela para gestão simples de materiais que não têm propriedades elétricas

CREATE TABLE IF NOT EXISTS materials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  category TEXT DEFAULT 'Outros',
  quantity_owned INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_materials_name ON materials(name);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Políticas temporárias seguras
DROP POLICY IF EXISTS "Public select on materials" ON materials;
CREATE POLICY "Public select on materials"
  ON materials FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Public insert on materials" ON materials;
CREATE POLICY "Public insert on materials"
  ON materials FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Public update on materials" ON materials;
CREATE POLICY "Public update on materials"
  ON materials FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Public delete on materials" ON materials;
CREATE POLICY "Public delete on materials"
  ON materials FOR DELETE
  USING (true);

-- ============================================
-- TRIGGER UPDATE
-- ============================================
DROP TRIGGER IF EXISTS update_materials_updated_at ON materials;
CREATE TRIGGER update_materials_updated_at
    BEFORE UPDATE ON materials
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
