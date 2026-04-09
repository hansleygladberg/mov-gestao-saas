-- ============================================================
-- 013_saas_billing_structure.sql
-- Estrutura completa de cobrança SaaS para média escala
-- ============================================================


-- ============================================================
-- PARTE 1: EXPANDIR TABELAS EXISTENTES
-- ============================================================

-- ── companies: campos de cadastro completo da empresa ────────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS cnpj          TEXT,
  ADD COLUMN IF NOT EXISTS phone         TEXT,
  ADD COLUMN IF NOT EXISTS email         TEXT,
  ADD COLUMN IF NOT EXISTS website       TEXT,
  ADD COLUMN IF NOT EXISTS logo_url      TEXT,
  ADD COLUMN IF NOT EXISTS address       TEXT,
  ADD COLUMN IF NOT EXISTS city          TEXT,
  ADD COLUMN IF NOT EXISTS state         TEXT,
  ADD COLUMN IF NOT EXISTS zip_code      TEXT,
  ADD COLUMN IF NOT EXISTS owner_name    TEXT,          -- responsável legal
  ADD COLUMN IF NOT EXISTS owner_email   TEXT,
  ADD COLUMN IF NOT EXISTS slug          TEXT UNIQUE,   -- mov-producoes (para URL)
  ADD COLUMN IF NOT EXISTS is_active     BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS notes         TEXT;          -- anotações internas (super admin)

-- ── users: campos completos do usuário ───────────────────────
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name           TEXT,
  ADD COLUMN IF NOT EXISTS phone          TEXT,
  ADD COLUMN IF NOT EXISTS avatar_url     TEXT,
  ADD COLUMN IF NOT EXISTS is_super_admin BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_active      BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login_at  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS invited_by     UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invited_at     TIMESTAMPTZ;


-- ============================================================
-- PARTE 2: PLANOS
-- ============================================================

CREATE TABLE IF NOT EXISTS plans (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,            -- 'Starter', 'Pro', 'Agency'
  slug            TEXT UNIQUE NOT NULL,     -- 'starter', 'pro', 'agency'
  description     TEXT,
  price_monthly   DECIMAL(10,2) NOT NULL DEFAULT 0,
  price_yearly    DECIMAL(10,2),            -- preço com desconto anual (NULL = não disponível)
  currency        TEXT NOT NULL DEFAULT 'BRL',
  -- Limites de uso
  max_users       INTEGER DEFAULT 3,        -- NULL = ilimitado
  max_projects    INTEGER DEFAULT 30,
  max_clients     INTEGER DEFAULT 100,
  -- Features como lista JSON: ["financeiro", "calendario", "relatorios"]
  features        JSONB NOT NULL DEFAULT '[]',
  -- Controle
  is_active       BOOLEAN DEFAULT true,
  is_public       BOOLEAN DEFAULT true,     -- exibir na página de preços
  trial_days      INTEGER DEFAULT 14,
  sort_order      INTEGER DEFAULT 0,        -- ordem de exibição
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Planos padrão
INSERT INTO plans (name, slug, description, price_monthly, price_yearly, max_users, max_projects, max_clients, features, sort_order)
VALUES
  (
    'Starter', 'starter',
    'Para freelancers e pequenas produções',
    97.00, 970.00,
    2, 20, 50,
    '["projetos","financeiro_basico","agenda","clientes"]',
    1
  ),
  (
    'Pro', 'pro',
    'Para produtoras em crescimento',
    197.00, 1970.00,
    5, 100, 300,
    '["projetos","financeiro_completo","agenda","clientes","relatorios","orcamentos","contratos_fixos"]',
    2
  ),
  (
    'Agency', 'agency',
    'Para agências e grandes equipes',
    397.00, 3970.00,
    NULL, NULL, NULL,
    '["projetos","financeiro_completo","agenda","clientes","relatorios","orcamentos","contratos_fixos","multi_usuario","api_acesso","suporte_prioritario"]',
    3
  )
ON CONFLICT (slug) DO NOTHING;


-- ============================================================
-- PARTE 3: CUPONS DE DESCONTO
-- ============================================================

CREATE TABLE IF NOT EXISTS coupons (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code            TEXT UNIQUE NOT NULL,               -- 'PROMO50', 'PARCEIRO2025'
  description     TEXT,                               -- uso interno
  -- Tipo de desconto
  discount_type   TEXT NOT NULL
                  CHECK (discount_type IN ('percent', 'fixed')),
  discount_value  DECIMAL(10,2) NOT NULL,             -- 50 = 50% ou R$50,00
  -- Duração do desconto
  applies_to      TEXT NOT NULL DEFAULT 'forever'
                  CHECK (applies_to IN ('once', 'months', 'forever')),
  applies_months  INTEGER,                            -- quantos meses (se applies_to = 'months')
  -- Restrições de uso
  max_uses        INTEGER,                            -- NULL = ilimitado
  used_count      INTEGER DEFAULT 0,
  -- Validade
  valid_from      TIMESTAMPTZ DEFAULT NOW(),
  valid_until     TIMESTAMPTZ,                        -- NULL = sem expiração
  -- Restrições por plano (NULL = todos os planos)
  plan_ids        UUID[],
  -- Controle
  is_active       BOOLEAN DEFAULT true,
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Índices de busca rápida por código
CREATE INDEX IF NOT EXISTS idx_coupons_code ON coupons(UPPER(code));


-- ============================================================
-- PARTE 4: ASSINATURAS
-- ============================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  plan_id                 UUID NOT NULL REFERENCES plans(id),
  coupon_id               UUID REFERENCES coupons(id) ON DELETE SET NULL,

  -- Status do ciclo de vida
  status                  TEXT NOT NULL DEFAULT 'trial'
                          CHECK (status IN ('trial','active','past_due','suspended','cancelled')),
  billing_cycle           TEXT NOT NULL DEFAULT 'monthly'
                          CHECK (billing_cycle IN ('monthly','yearly')),

  -- Valores (snapshot no momento da assinatura)
  base_price              DECIMAL(10,2) NOT NULL,    -- preço do plano
  discount_amount         DECIMAL(10,2) DEFAULT 0,   -- valor do desconto aplicado
  final_price             DECIMAL(10,2) NOT NULL,    -- valor real cobrado
  currency                TEXT NOT NULL DEFAULT 'BRL',

  -- Período de trial
  trial_starts_at         TIMESTAMPTZ DEFAULT NOW(),
  trial_ends_at           TIMESTAMPTZ,

  -- Período atual de cobrança
  current_period_start    TIMESTAMPTZ,
  current_period_end      TIMESTAMPTZ,               -- próxima data de cobrança

  -- Cancelamento
  cancelled_at            TIMESTAMPTZ,
  cancel_reason           TEXT,

  -- Método de pagamento
  payment_method          TEXT DEFAULT 'stripe'
                          CHECK (payment_method IN ('stripe','pix','boleto','manual')),

  -- Integração Stripe (preencher quando integrar)
  stripe_customer_id      TEXT,
  stripe_subscription_id  TEXT,
  stripe_price_id         TEXT,

  -- Gestão de inadimplência (dunning)
  past_due_since          TIMESTAMPTZ,
  dunning_attempts        INTEGER DEFAULT 0,         -- quantas tentativas de cobrança já ocorreram
  last_dunning_at         TIMESTAMPTZ,
  suspend_after_days      INTEGER DEFAULT 7,         -- suspender após N dias inadimplente

  -- Notas internas
  notes                   TEXT,

  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),

  -- Garante apenas 1 assinatura ativa por empresa
  CONSTRAINT unique_active_subscription UNIQUE (company_id, status)
              DEFERRABLE INITIALLY DEFERRED
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company  ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status   ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_period   ON subscriptions(current_period_end);
CREATE INDEX IF NOT EXISTS idx_subscriptions_past_due ON subscriptions(past_due_since) WHERE past_due_since IS NOT NULL;


-- ============================================================
-- PARTE 5: FATURAS
-- ============================================================

-- Sequência para numeração de faturas
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1;

CREATE TABLE IF NOT EXISTS invoices (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id           UUID REFERENCES subscriptions(id) ON DELETE SET NULL,

  -- Número legível: MOV-2025-00001
  invoice_number            TEXT UNIQUE NOT NULL
                            DEFAULT 'MOV-' || TO_CHAR(NOW(),'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 5, '0'),

  status                    TEXT NOT NULL DEFAULT 'open'
                            CHECK (status IN ('draft','open','paid','void','uncollectible')),

  -- Valores
  subtotal                  DECIMAL(10,2) NOT NULL,
  discount_amount           DECIMAL(10,2) DEFAULT 0,
  total                     DECIMAL(10,2) NOT NULL,     -- subtotal - discount
  amount_paid               DECIMAL(10,2) DEFAULT 0,
  amount_due                DECIMAL(10,2)               -- total - amount_paid (calculado)
                            GENERATED ALWAYS AS (total - amount_paid) STORED,
  currency                  TEXT NOT NULL DEFAULT 'BRL',

  -- Período de referência
  period_start              DATE,
  period_end                DATE,

  -- Datas
  due_date                  DATE NOT NULL,
  paid_at                   TIMESTAMPTZ,
  voided_at                 TIMESTAMPTZ,

  -- Pagamento
  payment_method            TEXT,
  stripe_invoice_id         TEXT,
  stripe_payment_intent_id  TEXT,
  pix_code                  TEXT,                       -- código PIX copia e cola
  boleto_barcode            TEXT,                       -- linha digitável do boleto
  boleto_url                TEXT,
  pdf_url                   TEXT,                       -- link para o PDF da fatura

  -- Descrição
  description               TEXT,                       -- ex: "Assinatura Pro - Maio/2025"

  created_at                TIMESTAMPTZ DEFAULT NOW(),
  updated_at                TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoices_company    ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status     ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date   ON invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_sub        ON invoices(subscription_id);


-- ============================================================
-- PARTE 6: LOG DE EVENTOS DE COBRANÇA (AUDITORIA)
-- ============================================================

CREATE TABLE IF NOT EXISTS billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subscription_id UUID REFERENCES subscriptions(id) ON DELETE SET NULL,
  invoice_id      UUID REFERENCES invoices(id) ON DELETE SET NULL,

  event_type      TEXT NOT NULL,
  -- Exemplos: 'subscription_created', 'trial_started', 'trial_expired',
  --           'payment_succeeded', 'payment_failed', 'subscription_cancelled',
  --           'plan_upgraded', 'plan_downgraded', 'coupon_applied',
  --           'account_suspended', 'account_reactivated', 'refund_issued'

  payload         JSONB DEFAULT '{}',   -- dados do evento (ex: valor, plano anterior)
  created_by      UUID REFERENCES users(id) ON DELETE SET NULL,  -- NULL = sistema
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_events_company ON billing_events(company_id);
CREATE INDEX IF NOT EXISTS idx_billing_events_type    ON billing_events(event_type);
CREATE INDEX IF NOT EXISTS idx_billing_events_date    ON billing_events(created_at DESC);


-- ============================================================
-- PARTE 7: FUNÇÕES AUXILIARES
-- ============================================================

-- Verifica se o usuário logado é super admin
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT COALESCE(
    (SELECT is_super_admin FROM users WHERE id = auth.uid()),
    false
  );
$$;

-- Retorna o status da assinatura de uma empresa
CREATE OR REPLACE FUNCTION get_subscription_status(p_company_id UUID)
RETURNS TEXT
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT status
  FROM subscriptions
  WHERE company_id = p_company_id
  ORDER BY created_at DESC
  LIMIT 1;
$$;

-- Verifica se a empresa pode acessar a plataforma (trial ou ativa)
CREATE OR REPLACE FUNCTION company_can_access(p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM subscriptions
    WHERE company_id = p_company_id
      AND status IN ('trial', 'active')
      AND (
        status = 'active'
        OR (status = 'trial' AND trial_ends_at > NOW())
      )
  );
$$;

-- Calcula o valor final após aplicar cupom
CREATE OR REPLACE FUNCTION apply_coupon(
  p_base_price DECIMAL,
  p_coupon_id  UUID
)
RETURNS TABLE(discount_amount DECIMAL, final_price DECIMAL)
LANGUAGE plpgsql STABLE AS $$
DECLARE
  v_coupon coupons%ROWTYPE;
BEGIN
  IF p_coupon_id IS NULL THEN
    RETURN QUERY SELECT 0::DECIMAL, p_base_price;
    RETURN;
  END IF;

  SELECT * INTO v_coupon FROM coupons WHERE id = p_coupon_id AND is_active = true;

  IF NOT FOUND THEN
    RETURN QUERY SELECT 0::DECIMAL, p_base_price;
    RETURN;
  END IF;

  IF v_coupon.discount_type = 'percent' THEN
    RETURN QUERY SELECT
      ROUND((p_base_price * v_coupon.discount_value / 100), 2),
      ROUND(p_base_price - (p_base_price * v_coupon.discount_value / 100), 2);
  ELSE
    RETURN QUERY SELECT
      LEAST(v_coupon.discount_value, p_base_price),
      GREATEST(p_base_price - v_coupon.discount_value, 0);
  END IF;
END;
$$;


-- ============================================================
-- PARTE 8: RLS — SEGURANÇA POR LINHA
-- ============================================================

ALTER TABLE plans             ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_events    ENABLE ROW LEVEL SECURITY;

-- ── plans: leitura pública, escrita apenas super admin ───────
CREATE POLICY "plans_select" ON plans
  FOR SELECT USING (is_public = true OR is_super_admin());

CREATE POLICY "plans_write" ON plans
  FOR ALL USING (is_super_admin());

-- ── coupons: apenas super admin ──────────────────────────────
CREATE POLICY "coupons_super_admin" ON coupons
  FOR ALL USING (is_super_admin());

-- ── subscriptions: empresa vê a própria, super admin vê tudo ─
CREATE POLICY "subscriptions_select" ON subscriptions
  FOR SELECT USING (
    company_id = get_current_company_id()
    OR is_super_admin()
  );

CREATE POLICY "subscriptions_write" ON subscriptions
  FOR ALL USING (is_super_admin());

-- ── invoices: empresa vê as próprias, super admin vê tudo ────
CREATE POLICY "invoices_select" ON invoices
  FOR SELECT USING (
    company_id = get_current_company_id()
    OR is_super_admin()
  );

CREATE POLICY "invoices_write" ON invoices
  FOR ALL USING (is_super_admin());

-- ── billing_events: empresa vê os próprios, super admin vê tudo
CREATE POLICY "billing_events_select" ON billing_events
  FOR SELECT USING (
    company_id = get_current_company_id()
    OR is_super_admin()
  );

CREATE POLICY "billing_events_insert" ON billing_events
  FOR INSERT WITH CHECK (is_super_admin());


-- ============================================================
-- PARTE 9: VIEWS ÚTEIS PARA O PAINEL SUPER ADMIN
-- ============================================================

-- Visão geral de cada empresa com status de assinatura
CREATE OR REPLACE VIEW v_companies_overview AS
SELECT
  c.id,
  c.name,
  c.slug,
  c.owner_name,
  c.owner_email,
  c.phone,
  c.is_active,
  c.created_at,

  -- Assinatura
  s.status                  AS subscription_status,
  p.name                    AS plan_name,
  s.final_price             AS monthly_price,
  s.billing_cycle,
  s.trial_ends_at,
  s.current_period_end      AS next_billing_date,
  s.past_due_since,
  s.dunning_attempts,

  -- Usuários
  (SELECT COUNT(*) FROM users u WHERE u.company_id = c.id AND u.is_active = true)
                            AS active_users,

  -- Projetos
  (SELECT COUNT(*) FROM projects pr WHERE pr.company_id = c.id)
                            AS total_projects,

  -- Fatura em aberto
  (SELECT SUM(amount_due) FROM invoices i
   WHERE i.company_id = c.id AND i.status = 'open')
                            AS open_invoices_total

FROM companies c
LEFT JOIN subscriptions s ON s.company_id = c.id
LEFT JOIN plans p         ON p.id = s.plan_id;

-- MRR (Monthly Recurring Revenue)
CREATE OR REPLACE VIEW v_mrr AS
SELECT
  SUM(CASE WHEN s.billing_cycle = 'monthly' THEN s.final_price
           WHEN s.billing_cycle = 'yearly'  THEN s.final_price / 12
           ELSE 0 END)    AS mrr,
  COUNT(*)                AS total_active_subscriptions,
  COUNT(*) FILTER (WHERE s.status = 'trial')      AS trial_count,
  COUNT(*) FILTER (WHERE s.status = 'active')     AS active_count,
  COUNT(*) FILTER (WHERE s.status = 'past_due')   AS past_due_count,
  COUNT(*) FILTER (WHERE s.status = 'suspended')  AS suspended_count
FROM subscriptions s
WHERE s.status IN ('trial', 'active', 'past_due');


-- ============================================================
-- COMENTÁRIOS PARA DOCUMENTAÇÃO
-- ============================================================

COMMENT ON TABLE plans IS
  'Planos disponíveis na plataforma. Gerenciado pelo super admin.';

COMMENT ON TABLE coupons IS
  'Cupons de desconto. Apenas super admin pode criar/ver.';

COMMENT ON TABLE subscriptions IS
  'Uma assinatura por empresa. Controla acesso, preço e inadimplência.';

COMMENT ON TABLE invoices IS
  'Faturas geradas a cada ciclo de cobrança. invoice_number é legível (MOV-YYYY-NNNNN).';

COMMENT ON TABLE billing_events IS
  'Log imutável de todos os eventos de cobrança para auditoria.';

COMMENT ON COLUMN subscriptions.status IS
  'trial → active (pagamento confirmado) → past_due (cobrança falhou) → suspended (bloqueado) → cancelled';

COMMENT ON COLUMN subscriptions.dunning_attempts IS
  'Número de tentativas de cobrança após inadimplência. Suspender após limite definido em suspend_after_days.';

COMMENT ON COLUMN coupons.applies_to IS
  'once = só no primeiro mês | months = por N meses | forever = sempre enquanto ativo';
