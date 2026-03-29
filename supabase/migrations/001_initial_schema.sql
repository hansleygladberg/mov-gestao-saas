-- Create tables for MOV Gestão SaaS

-- Companies (Multi-tenant)
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  domain TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Users with Roles
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT,
  status TEXT CHECK (status IN ('orcamento', 'orcamento_desaprovado', 'producao', 'edicao', 'entregue', 'pausado')) DEFAULT 'orcamento',
  value DECIMAL(12,2) DEFAULT 0,
  delivery_date DATE,
  description TEXT,
  progress INTEGER DEFAULT 0,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Clients
CREATE TABLE clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  segment TEXT,
  monthly_value DECIMAL(12,2),
  phone TEXT,
  email TEXT,
  whatsapp TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Transactions (Financeiro)
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  type TEXT CHECK (type IN ('entrada', 'saida', 'arec', 'apag')) NOT NULL,
  value DECIMAL(12,2) NOT NULL,
  description TEXT,
  category TEXT,
  transaction_date DATE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Events (Calendário)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_type TEXT CHECK (event_type IN ('capt', 'entrega', 'fixo', 'manual')) DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for better performance
CREATE INDEX idx_users_company ON users(company_id);
CREATE INDEX idx_projects_company ON projects(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_transactions_company ON transactions(company_id);
CREATE INDEX idx_events_company ON events(company_id);

-- Row Level Security (RLS)
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Users can only see their company data
CREATE POLICY "Users can view their company" ON users
  FOR SELECT USING (auth.uid()::text = id::text OR company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view company" ON companies
  FOR SELECT USING (id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view projects" ON projects
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view clients" ON clients
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view transactions" ON transactions
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));

CREATE POLICY "Users can view events" ON events
  FOR SELECT USING (company_id IN (
    SELECT company_id FROM users WHERE id::text = auth.uid()::text
  ));
