-- Migration: Create maintenance_records table
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS maintenance_records (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    equipment_id UUID NOT NULL REFERENCES equipments(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('preventive', 'corrective', 'replacement')),
    description TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    cost NUMERIC(10, 2),
    parts TEXT,
    technician TEXT,
    scheduled_date DATE,
    completed_date TIMESTAMPTZ,
    next_maintenance_date DATE,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_maintenance_equipment ON maintenance_records(equipment_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_records(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_next_date ON maintenance_records(next_maintenance_date);

-- Enable RLS
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Policy: allow all operations for authenticated users
CREATE POLICY "Users can do everything" ON maintenance_records
    FOR ALL USING (true) WITH CHECK (true);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_maintenance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER maintenance_updated_at
    BEFORE UPDATE ON maintenance_records
    FOR EACH ROW
    EXECUTE FUNCTION update_maintenance_updated_at();
