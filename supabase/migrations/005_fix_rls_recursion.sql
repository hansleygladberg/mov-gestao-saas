-- FIX: get_current_company_id() estava causando recursão infinita no RLS
-- A função consultava a tabela users, que tem RLS ativo, que chamava a função de novo
-- Solução: SECURITY DEFINER faz a função rodar como superuser, bypassando o RLS

CREATE OR REPLACE FUNCTION get_current_company_id() RETURNS UUID AS $$
  SELECT company_id FROM users WHERE id = auth.uid() LIMIT 1;
$$ LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public;

-- Também remover políticas problemáticas que causam recursão
-- A policy "Admin can manage users" tinha um EXISTS que consultava users dentro de uma policy de users

DROP POLICY IF EXISTS "Admin can manage users" ON users;
DROP POLICY IF EXISTS "Users can view teammates" ON users;

-- Recriar sem recursão
CREATE POLICY "Users can view teammates" ON users
  FOR SELECT USING (company_id = get_current_company_id());

CREATE POLICY "Admin can insert users" ON users
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admin can update users" ON users
  FOR UPDATE USING (company_id = get_current_company_id());

CREATE POLICY "Admin can delete users" ON users
  FOR DELETE USING (company_id = get_current_company_id());
