-- Migration: Sistema de Cases e Numeração
-- Adiciona campos para organizar equipamentos em cases numerados

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipments' AND column_name = 'units_per_case'
  ) THEN
    ALTER TABLE equipments ADD COLUMN units_per_case INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipments' AND column_name = 'case_prefix'
  ) THEN
    ALTER TABLE equipments ADD COLUMN case_prefix TEXT;
  END IF;
END $$;

COMMENT ON COLUMN equipments.units_per_case IS 'Quantos aparelhos por case (ex: 10 par leds por case)';
COMMENT ON COLUMN equipments.case_prefix IS 'Prefixo do case para identificação (ex: PL, MH)';

-- Adicionar coluna de cases alocados na tabela de alocações
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'equipment_allocations' AND column_name = 'allocated_cases'
  ) THEN
    ALTER TABLE equipment_allocations ADD COLUMN allocated_cases JSONB;
  END IF;
END $$;

COMMENT ON COLUMN equipment_allocations.allocated_cases IS 'Array JSON com os números dos cases alocados (ex: [1, 2, 3])';
