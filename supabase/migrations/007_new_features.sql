-- ── Agenda: campo de horário ──────────────────────────────────────────────
ALTER TABLE events ADD COLUMN IF NOT EXISTS event_time TIME;

-- ── Projetos: token público para aprovação de orçamento ───────────────────
ALTER TABLE projects ADD COLUMN IF NOT EXISTS quote_token UUID DEFAULT gen_random_uuid();
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_quote_token ON projects(quote_token);

-- Garantir que projetos existentes tenham token único
UPDATE projects SET quote_token = gen_random_uuid() WHERE quote_token IS NULL;

-- ── Empresas de locação de equipamentos ───────────────────────────────────
CREATE TABLE IF NOT EXISTS rental_companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_companies_company ON rental_companies(company_id);
ALTER TABLE rental_companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view rental companies" ON rental_companies
  FOR SELECT USING (company_id = get_current_company_id());

CREATE POLICY "Editors can insert rental companies" ON rental_companies
  FOR INSERT WITH CHECK (company_id = get_current_company_id());

CREATE POLICY "Editors can update rental companies" ON rental_companies
  FOR UPDATE USING (company_id = get_current_company_id());

CREATE POLICY "Admins can delete rental companies" ON rental_companies
  FOR DELETE USING (company_id = get_current_company_id());
