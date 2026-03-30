-- Add notes field to clients table for prospecção and observations
ALTER TABLE clients ADD COLUMN IF NOT EXISTS notes TEXT;
