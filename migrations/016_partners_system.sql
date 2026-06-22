-- Migration: Sistema de Parceiros
-- Descrição: Cria tabela de parceiros e adapta equipment_allocations para suportar alocações a parceiros

-- ============================================
-- TABELA: partners
-- ============================================
CREATE TABLE IF NOT EXISTS partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- ADAPTAR: equipment_allocations
-- Adicionar partner_id como destino alternativo
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_allocations' AND column_name = 'partner_id'
  ) THEN
    ALTER TABLE equipment_allocations ADD COLUMN partner_id UUID REFERENCES partners(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Tornar event_id nullable (caso não seja)
ALTER TABLE equipment_allocations ALTER COLUMN event_id DROP NOT NULL;

-- Índice para partner_id
CREATE INDEX IF NOT EXISTS idx_equipment_allocations_partner_id ON equipment_allocations(partner_id);

-- ============================================
-- ATUALIZAR VIEW: equipment_availability
-- Considerar alocações de parceiros também
-- ============================================
CREATE OR REPLACE VIEW equipment_availability AS
SELECT
  e.id,
  e.name,
  e.quantity_owned,
  COALESCE(SUM(
    CASE
      WHEN ea.status = 'allocated'
      AND (
        (ea.event_id IS NOT NULL AND ev.status IN ('planned', 'in_progress'))
        OR
        (ea.partner_id IS NOT NULL)
      )
      THEN ea.quantity_allocated
      ELSE 0
    END
  ), 0) as quantity_allocated,
  e.quantity_owned - COALESCE(SUM(
    CASE
      WHEN ea.status = 'allocated'
      AND (
        (ea.event_id IS NOT NULL AND ev.status IN ('planned', 'in_progress'))
        OR
        (ea.partner_id IS NOT NULL)
      )
      THEN ea.quantity_allocated
      ELSE 0
    END
  ), 0) as quantity_available
FROM equipments e
LEFT JOIN equipment_allocations ea ON e.id = ea.equipment_id
LEFT JOIN events ev ON ea.event_id = ev.id
GROUP BY e.id, e.name, e.quantity_owned;

-- ============================================
-- TRIGGER: Atualizar updated_at em partners
-- ============================================
DROP TRIGGER IF EXISTS update_partners_updated_at ON partners;
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON partners
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTÁRIOS
-- ============================================
COMMENT ON TABLE partners IS 'Parceiros que podem receber alocações de equipamentos';
COMMENT ON COLUMN equipment_allocations.partner_id IS 'ID do parceiro ao qual o equipamento está alocado (alternativa a event_id)';
