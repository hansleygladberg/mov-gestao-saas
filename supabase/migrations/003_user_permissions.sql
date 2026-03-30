-- Add permissions JSONB to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB DEFAULT '{
  "projetos": {"view": true, "create": true, "edit": true, "delete": false},
  "clientes": {"view": true, "create": true, "edit": true, "delete": false},
  "financeiro": {"view": true, "create": true, "edit": true, "delete": false},
  "relatorios": {"view": true},
  "freelancers": {"view": true, "create": false, "edit": false, "delete": false},
  "adm": {"view": false}
}';

-- Admin users get full permissions
UPDATE users SET permissions = '{
  "projetos": {"view": true, "create": true, "edit": true, "delete": true},
  "clientes": {"view": true, "create": true, "edit": true, "delete": true},
  "financeiro": {"view": true, "create": true, "edit": true, "delete": true},
  "relatorios": {"view": true},
  "freelancers": {"view": true, "create": true, "edit": true, "delete": true},
  "adm": {"view": true}
}' WHERE role = 'admin';

-- Add invited_by column
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES users(id);
ALTER TABLE users ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- RLS for user_permissions via users table
CREATE POLICY "Users can view teammates" ON users
  FOR SELECT USING (company_id = get_current_company_id());

CREATE POLICY "Admin can manage users" ON users
  FOR ALL USING (
    company_id = get_current_company_id() AND
    EXISTS (SELECT 1 FROM users u WHERE u.id::text = auth.uid()::text AND u.role = 'admin')
  );
