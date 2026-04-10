-- Despesas fixas recorrentes (aluguel, internet, salários, etc.)
CREATE TABLE IF NOT EXISTS recurring_expenses (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  value            NUMERIC(12,2) NOT NULL DEFAULT 0,
  category         TEXT,
  due_day          INT NOT NULL DEFAULT 5 CHECK (due_day BETWEEN 1 AND 31),
  status           TEXT NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','pausado','cancelado')),
  notes            TEXT,
  generated_months TEXT[] NOT NULL DEFAULT '{}',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_expenses_company ON recurring_expenses(company_id);

ALTER TABLE recurring_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_recurring_expenses" ON recurring_expenses
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));
