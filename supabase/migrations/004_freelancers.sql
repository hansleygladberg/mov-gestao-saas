CREATE TABLE freelancers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  area TEXT,
  whatsapp TEXT,
  email TEXT,
  daily_rate DECIMAL(10,2),
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_freelancers_company ON freelancers(company_id);
ALTER TABLE freelancers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view freelancers" ON freelancers
  FOR SELECT USING (company_id = get_current_company_id());
CREATE POLICY "Company members can manage freelancers" ON freelancers
  FOR ALL USING (company_id = get_current_company_id());
