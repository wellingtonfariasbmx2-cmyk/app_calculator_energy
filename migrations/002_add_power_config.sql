-- Migration to add generator and mainpower configuration columns to calculations table

ALTER TABLE calculations
ADD COLUMN IF NOT EXISTS generator_config JSONB,
ADD COLUMN IF NOT EXISTS mainpower_config JSONB;
