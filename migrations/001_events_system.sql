-- Migration: Sistema de Eventos
-- Descrição: Cria tabelas para gestão de eventos com controle automático de estoque

-- ============================================
-- TABELA: events
-- ============================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  client_name TEXT,
  venue TEXT NOT NULL,
  address TEXT,
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  setup_time TEXT,
  event_time TEXT,
  status TEXT NOT NULL CHECK (status IN ('planned', 'in_progress', 'completed', 'cancelled')),
  notes TEXT,
  technical_responsible TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TABELA: equipment_allocations
-- ============================================
CREATE TABLE IF NOT EXISTS equipment_allocations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  equipment_id UUID REFERENCES equipments(id),
  quantity_allocated INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('allocated', 'returned')),
  allocated_at TIMESTAMPTZ DEFAULT NOW(),
  returned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADICIONAR CAMPO event_id EM distribution_projects
-- Nota: Esta tabela é criada pela tabela 'calculations' que armazena
-- tanto calculations quanto distribution_projects
-- ============================================

-- Verificar se a tabela calculations existe, se não, criar
CREATE TABLE IF NOT EXISTS calculations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  technical_responsible TEXT,
  voltage_system INTEGER,
  total_watts NUMERIC,
  total_amperes NUMERIC,
  items JSONB,
  ports JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Adicionar campo event_id se não existir
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'calculations' AND column_name = 'event_id'
  ) THEN
    ALTER TABLE calculations ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_events_start_date ON events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_equipment_allocations_event_id ON equipment_allocations(event_id);
CREATE INDEX IF NOT EXISTS idx_equipment_allocations_equipment_id ON equipment_allocations(equipment_id);
CREATE INDEX IF NOT EXISTS idx_equipment_allocations_status ON equipment_allocations(status);
CREATE INDEX IF NOT EXISTS idx_calculations_event_id ON calculations(event_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_allocations ENABLE ROW LEVEL SECURITY;

-- Políticas para events
DROP POLICY IF EXISTS "Users can view their own events" ON events;
CREATE POLICY "Users can view their own events"
  ON events FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own events" ON events;
CREATE POLICY "Users can insert their own events"
  ON events FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own events" ON events;
CREATE POLICY "Users can update their own events"
  ON events FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own events" ON events;
CREATE POLICY "Users can delete their own events"
  ON events FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Políticas para equipment_allocations
DROP POLICY IF EXISTS "Users can view their own allocations" ON equipment_allocations;
CREATE POLICY "Users can view their own allocations"
  ON equipment_allocations FOR SELECT
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can insert their own allocations" ON equipment_allocations;
CREATE POLICY "Users can insert their own allocations"
  ON equipment_allocations FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can update their own allocations" ON equipment_allocations;
CREATE POLICY "Users can update their own allocations"
  ON equipment_allocations FOR UPDATE
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own allocations" ON equipment_allocations;
CREATE POLICY "Users can delete their own allocations"
  ON equipment_allocations FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- VIEW: equipment_availability
-- Calcula disponibilidade de equipamentos em tempo real
-- ============================================
CREATE OR REPLACE VIEW equipment_availability AS
SELECT 
  e.id,
  e.name,
  e.quantity_owned,
  COALESCE(SUM(
    CASE 
      WHEN ea.status = 'allocated' 
      AND ev.status IN ('planned', 'in_progress')
      THEN ea.quantity_allocated 
      ELSE 0 
    END
  ), 0) as quantity_allocated,
  e.quantity_owned - COALESCE(SUM(
    CASE 
      WHEN ea.status = 'allocated' 
      AND ev.status IN ('planned', 'in_progress')
      THEN ea.quantity_allocated 
      ELSE 0 
    END
  ), 0) as quantity_available
FROM equipments e
LEFT JOIN equipment_allocations ea ON e.id = ea.equipment_id
LEFT JOIN events ev ON ea.event_id = ev.id
GROUP BY e.id, e.name, e.quantity_owned;

-- ============================================
-- FUNÇÃO: Atualizar updated_at automaticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para events
DROP TRIGGER IF EXISTS update_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================
COMMENT ON TABLE events IS 'Tabela de eventos com gestão automática de estoque';
COMMENT ON TABLE equipment_allocations IS 'Alocações de equipamentos por evento';
COMMENT ON COLUMN calculations.event_id IS 'ID do evento ao qual este projeto está vinculado';
COMMENT ON VIEW equipment_availability IS 'View que calcula disponibilidade de equipamentos em tempo real';
