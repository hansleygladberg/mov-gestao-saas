-- Cria tabela freelancers (caso não exista)
CREATE TABLE IF NOT EXISTS freelancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  daily_rate DECIMAL(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_freelancers_company ON freelancers(company_id);

ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Company members can view freelancers" ON freelancers;
DROP POLICY IF EXISTS "Company members can manage freelancers" ON freelancers;

CREATE POLICY "Company members can view freelancers" ON freelancers
  FOR SELECT USING (company_id = get_current_company_id());
CREATE POLICY "Company members can manage freelancers" ON freelancers
  FOR ALL USING (company_id = get_current_company_id());

-- Adiciona client_id em projects (caso não exista)
ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_projects_client ON projects(client_id);

-- Adiciona coluna data em rental_companies (caso não exista)
ALTER TABLE rental_companies ADD COLUMN IF NOT EXISTS data JSONB DEFAULT '{}';
