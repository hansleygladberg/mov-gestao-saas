-- Create contracts table
CREATE TABLE IF NOT EXISTS contracts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  value DECIMAL(12,2) NOT NULL DEFAULT 0,
  due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day >= 1 AND due_day <= 31),
  start_date DATE,
  status TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo', 'pausado', 'cancelado')),
  notes TEXT,
  generated_months TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can only see contracts from their company
CREATE POLICY "contracts_company_policy" ON contracts
  FOR ALL USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
  );

-- Index for performance
CREATE INDEX IF NOT EXISTS contracts_company_id_idx ON contracts(company_id);
CREATE INDEX IF NOT EXISTS contracts_project_id_idx ON contracts(project_id);
