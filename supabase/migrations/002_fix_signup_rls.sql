-- Allow creation during signup (unauthenticated)
CREATE POLICY "Allow signup to create companies" ON companies
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow signup to create users" ON users
  FOR INSERT WITH CHECK (true);
