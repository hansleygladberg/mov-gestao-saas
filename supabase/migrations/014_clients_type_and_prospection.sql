-- Adiciona tipo de cliente (empresa/pessoa) e campos relacionados
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS client_type TEXT DEFAULT 'empresa' CHECK (client_type IN ('empresa', 'pessoa')),
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS prospection_source TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;
