# MOV Gestão SaaS — Documentação Completa

> Última atualização: 2026-04-06
> Este arquivo documenta tudo que foi implementado no sistema. Use-o com qualquer IA para reproduzir ou estender o projeto.

---

## 1. Visão Geral

**MOV Gestão** é um SaaS multi-tenant para gestão de produtoras audiovisuais. Permite controlar projetos, clientes, financeiro, agenda, freelancers e orçamentos em um único sistema.

- **URL Produção:** https://mov-gestao-saas.vercel.app
- **Repositório:** https://github.com/hansleygladberg/mov-gestao-saas
- **Stack:** Next.js 16 + TypeScript + Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Vercel (auto-deploy via push para `main`)

---

## 2. Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16.2.1 (App Router) |
| Linguagem | TypeScript 5 |
| Banco de dados | Supabase (PostgreSQL) |
| Autenticação | Supabase Auth (email/senha) |
| ORM | Supabase JS Client v2 |
| Estilização | Inline styles (React.CSSProperties) |
| Fontes | Montserrat + Open Sans (Google Fonts via next/font) |
| Deploy | Vercel |
| Runtime | Node.js (API routes) + Edge (proxy) |

**Dependências principais:**
```json
{
  "@supabase/ssr": "^0.9.0",
  "@supabase/supabase-js": "^2.100.1",
  "next": "16.2.1",
  "react": "19.2.4"
}
```

---

## 3. Variáveis de Ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable__<chave>
SUPABASE_SERVICE_ROLE_KEY=eyJ...<jwt completo>
```

No Vercel: Settings → Environment Variables → adicionar as 3 variáveis acima.
No Supabase: Authentication → URL Configuration → Site URL = URL da produção.

---

## 4. Arquitetura Multi-tenant

Cada tabela tem `company_id` que isola os dados por empresa. RLS (Row Level Security) garante que cada empresa só vê seus próprios dados.

- **Signup:** cria registro em `companies` + `users` atomicamente
- **Login:** Supabase Auth → session JWT → middleware valida
- **Permissões:** roles `admin | editor | viewer` + permissões granulares por módulo

---

## 5. Banco de Dados — Tabelas

### `companies`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | ID da empresa |
| name | TEXT | Nome da produtora |
| domain | TEXT | Domínio opcional |
| settings | JSONB | Configurações: captacoes, tiposProjeto, segmentos, categoriasFinanceiras, categoriasCusto, **contratosFixos** |
| created_at | TIMESTAMPTZ | |

### `users`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | Mesmo ID do Supabase Auth |
| company_id | UUID FK | Empresa do usuário |
| email | TEXT | |
| name | TEXT | |
| role | TEXT | `admin` \| `editor` \| `viewer` |
| permissions | JSONB | Permissões granulares por módulo |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `projects`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| company_id | UUID FK | |
| name | TEXT | Nome do projeto |
| type | TEXT | Tipo de projeto (configurável) |
| status | TEXT | `orcamento` \| `producao` \| `edicao` \| `aguardando_cliente` \| `revisao` \| `aprovado` \| `finalizado` \| `pausado` \| `orcamento_desaprovado` |
| value | NUMERIC | Valor do projeto |
| delivery_date | DATE | Data de entrega |
| description | TEXT | |
| progress | INTEGER | 0–100 |
| client_id | UUID FK | Cliente vinculado |
| quote_token | UUID | Token para link público de orçamento |
| data | JSONB | Dados flexíveis (custos, pgtos, diárias, datas de captação, etc.) |
| created_at | TIMESTAMPTZ | |

**Estrutura do campo `data` (JSONB):**
```ts
{
  custos: Array<{ d: string; v: number; cat?: string; freelancerId?: string }>
  pgtos: Array<{ d: string; v: number; dt: string; rec: boolean }>
  diarias: Array<{ desc: string; qtd: number; v: number; rentalCompanyId?: string }>
  freeIds: string[]          // IDs de freelancers vinculados
  dCapt: string[]            // Datas de captação
  dCaptTimes: string[]       // Horários de captação
  dCaptLocais: string[]      // Locais de captação (opcional por data)
  margem: number             // Margem definida manualmente
  briefingUrl: string        // URL do briefing
  hasNF: boolean             // Tem Nota Fiscal (aplica 5% de imposto nos arec)
  contractId: string         // ID do contrato fixo vinculado (se coberto por contrato)
  comments: Array<{ id: string; userId: string; userName: string; text: string; link?: string; stage?: string; createdAt: string }>
}
```

**Estrutura do campo `settings.contratosFixos` (JSONB em companies):**
```ts
Array<{
  id: string                  // Date.now().toString()
  name: string                // Nome do contrato
  clientName: string          // Nome do cliente (texto livre)
  value: number               // Valor mensal
  dueDay: number              // Dia de vencimento (1–31)
  startDate: string           // Data de início (YYYY-MM-DD)
  status: 'ativo' | 'pausado'
  generatedMonths: string[]   // Meses já gerados, formato 'YYYY-MM'
}>
```

### `clients`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| company_id | UUID FK | |
| name | TEXT | |
| segment | TEXT | Segmento do cliente |
| monthly_value | NUMERIC | Valor de contrato mensal fixo |
| phone | TEXT | |
| email | TEXT | |
| whatsapp | TEXT | |
| notes | TEXT | Forma de prospecção / observações |
| created_at | TIMESTAMPTZ | |

### `transactions`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| company_id | UUID FK | |
| type | TEXT | `entrada` \| `saida` \| `arec` \| `apag` |
| value | NUMERIC | Valor |
| description | TEXT | |
| category | TEXT | Categoria (configurável) |
| transaction_date | DATE | Data da transação |
| project_id | UUID FK | Projeto vinculado (opcional) |
| client_id | UUID FK | Cliente vinculado (opcional) |
| created_at | TIMESTAMPTZ | |

**Tipos de transação:**
- `entrada` → dinheiro recebido
- `saida` → despesa paga
- `arec` → a receber (gerado ao aprovar projeto, para cada pgto pendente)
- `apag` → a pagar (gerado ao aprovar projeto, para custos/diárias/freelancers)

### `events`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| company_id | UUID FK | |
| title | TEXT | |
| event_date | DATE | |
| event_time | TIME | Horário (opcional) |
| event_type | TEXT | `capt` \| `entrega` \| `fixo` \| `manual` \| `reuniao` |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

### `freelancers`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| company_id | UUID FK | |
| name | TEXT | |
| area | TEXT | Especialidade |
| whatsapp | TEXT | |
| email | TEXT | |
| daily_rate | NUMERIC | Valor da diária |
| notes | TEXT | |
| is_active | BOOLEAN | |
| created_at | TIMESTAMPTZ | |

### `rental_companies`
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| id | UUID PK | |
| company_id | UUID FK | |
| name | TEXT | |
| contact | TEXT | Responsável |
| phone | TEXT | |
| email | TEXT | |
| notes | TEXT | |
| created_at | TIMESTAMPTZ | |

---

## 6. Migrações SQL (ordem de execução)

Execute no Supabase → SQL Editor na ordem abaixo:

```
001_initial_schema.sql     → Tabelas base + RLS
002_fix_signup_rls.sql     → Permite signup sem autenticação prévia
003_user_permissions.sql   → Coluna permissions JSONB em users
004_freelancers.sql        → Tabela freelancers
005_fix_rls_recursion.sql  → Corrige recursão no get_current_company_id()
006_company_settings.sql   → Coluna settings JSONB em companies
007_new_features.sql       → event_time, quote_token, tabela rental_companies
008_rental_company_data.sql → data JSONB em rental_companies
009_add_missing_columns.sql → client_id em projects, data em rental_companies
010_clients_notes.sql      → notes TEXT em clients
```

---

## 7. API Routes

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/projects` | Listar / Criar projeto |
| GET/PUT/DELETE | `/api/projects/[id]` | Ler / Editar / Excluir projeto |
| GET/POST | `/api/clients` | Listar / Criar cliente |
| GET/PUT/DELETE | `/api/clients/[id]` | Ler / Editar / Excluir cliente |
| GET/POST | `/api/transactions` | Listar / Criar transação |
| GET/PUT/DELETE | `/api/transactions/[id]` | Ler / Editar / Excluir transação |
| GET/POST | `/api/events` | Listar / Criar evento |
| GET/PUT/DELETE | `/api/events/[id]` | Ler / Editar / Excluir evento |
| GET/POST | `/api/freelancers` | Listar / Criar freelancer |
| GET/PUT/DELETE | `/api/freelancers/[id]` | Ler / Editar / Excluir freelancer |
| GET/POST | `/api/rental-companies` | Listar / Criar locadora |
| GET/PUT/DELETE | `/api/rental-companies/[id]` | Ler / Editar / Excluir locadora |
| GET/PUT | `/api/company-settings` | Ler / Salvar configurações |
| GET | `/api/me` | Dados do usuário logado |
| GET | `/api/quote/[token]` | Dados públicos de orçamento (sem auth) |
| POST | `/api/auth/signup` | Cadastro novo (cria empresa + usuário) |
| POST | `/api/auth/invite` | Convidar usuário para empresa existente |
| POST | `/api/auth/logout` | Logout |
| GET | `/api/backup` | Gerar backup JSON de todos os dados |
| POST | `/api/seed` | Popular banco com dados de teste |

---

## 8. Estrutura de Arquivos

```
mov-gestao-saas/
├── app/
│   ├── layout.tsx                    # Root layout, Google Fonts
│   ├── page.tsx                      # Landing page pública
│   ├── globals.css                   # CSS global + classes responsivas
│   ├── (auth)/
│   │   ├── login/page.tsx            # Tela de login
│   │   └── signup/page.tsx           # Tela de cadastro
│   ├── dashboard/
│   │   ├── layout.tsx                # Layout do dashboard (sidebar + mobile)
│   │   ├── page.tsx                  # Dashboard home (KPIs)
│   │   ├── projects/page.tsx         # Projetos + Orçamentos (pipeline)
│   │   ├── clients/page.tsx          # Clientes (CRUD + modal detalhe)
│   │   ├── finance/page.tsx          # Financeiro (a receber/pagar/histórico)
│   │   ├── events/page.tsx           # Agenda/Calendário
│   │   ├── quotes/page.tsx           # Orçamentos pendentes
│   │   ├── trash/page.tsx            # Lixeira de projetos
│   │   └── admin/
│   │       ├── page.tsx              # Painel ADM (server component)
│   │       ├── UserManagement.tsx    # Gestão de usuários + permissões
│   │       ├── FreelancerManagement.tsx # Cadastro de freelancers
│   │       ├── CompanySettings.tsx   # Configurações customizáveis
│   │       ├── RentalCompanies.tsx   # Empresas de locação (read-only histórico)
│   │       ├── BackupPanel.tsx       # Botão de backup do banco
│   │       └── SeedTools.tsx         # Popular/limpar dados de teste
│   ├── api/                          # Ver seção 7 acima
│   └── orcamento/[token]/page.tsx    # Página pública de aprovação de orçamento
├── lib/
│   ├── types.ts                      # Interfaces TypeScript globais
│   ├── toast.tsx                     # Sistema de toast notifications
│   └── supabase/
│       ├── client.ts                 # Client-side Supabase client
│       ├── server.ts                 # Server-side Supabase client
│       └── admin.ts                  # Service role client (bypassa RLS)
├── supabase/migrations/              # Migrações SQL (ver seção 6)
├── public/img/                       # Assets estáticos (logo.png, etc.)
├── DOCUMENTATION.md                  # Este arquivo
└── .env.local                        # Variáveis de ambiente (não commitado)
```

---

## 9. Funcionalidades Implementadas

### Dashboard (KPIs)
- Total de projetos ativos
- Receita total do mês
- Projetos pendentes de entrega
- A Pagar no mês atual (soma de transações `apag`)
- Gráfico/lista de projetos recentes

### Projetos
- **Pipeline completo:** Orçamento → Produção → Edição → Aguardando Cliente → Revisão → Aprovado → Finalizado
- **Formulário em 4 etapas:** Básico / Detalhes / Custos / Financeiro (com indicador de progresso e navegação Voltar/Avançar)
- **Botão "💾 Rascunho":** salva imediatamente como `status: orcamento` sem avançar etapas
- **Custos detalhados:** categoria, valor; quando categoria = "Freela" mostra select de freelancer
- **Pagamentos (pgtos):** múltiplas parcelas com data e status
- **Diárias:** itens com quantidade, valor e empresa de locação vinculada
- **Datas de captação:** data + horário + **local (opcional)**
- **Contrato fixo vinculado:** ao marcar "Coberto por contrato fixo" no Step 4, seleciona um contrato cadastrado → preenche o valor automaticamente → ao aprovar, **não gera transações `arec`** (receita já coberta pelo contrato)
- **Aprovação:** ao aprovar, gera `apag` (custos/diárias/freelancers) e `arec` (pgtos pendentes, exceto se contractId preenchido); cria eventos de captação e entrega na agenda
- **Acesso por etapa (stageAccess):** usuários não-admin podem ter acesso restrito a etapas específicas do pipeline
- **Comentários por etapa:** histórico de updates por projeto
- **Link de orçamento:** token único, página pública para cliente aprovar/reprovar
- **Concluídos:** seção separada na listagem
- **Lixeira:** projetos excluídos ficam na lixeira para recuperação
- **Badge de contrato:** modal de detalhe exibe "🔗 Nome do contrato" quando projeto vinculado

### Clientes
- CRUD completo com view grid (cards com avatar colorido) e view lista
- Toggle de visualização (grid / lista)
- Campo "Forma de Prospecção" (notes)
- Busca por nome, email e segmento
- 4 cards de métricas: Total, Novos este Mês, Com Dados de Contato, Valor Mensal Total
- Botão "🔗 Link de Cadastro" (copia `/cadastro` para área de transferência)
- Modal de detalhe: KPIs (projetos, valor total, ticket médio, contrato fixo), último projeto, projetos listados

### Financeiro
- **3 abas:** Visão Geral / Receber / Pagar
- **Botões rápidos no cabeçalho:** ↑ Venda Rápida / ↓ Lançar Despesa / ⚙ Categorias
- **Contas a Receber** (arec + entradas): listagem por mês, aging (em dia / 1-15 dias / +30 dias)
- **Contas a Pagar** (apag + despesas): listagem por mês
- **Gastos por Categoria:** breakdown com barras de progresso
- **Contratos Fixos Mensais:** seção dedicada com botão "⚡ Gerar cobrança" por contrato/mês; detecta se já foi gerado no mês
- **Histórico colapsável:** ver todas as transações do período
- **Marcar como pago:** modal para confirmar valor e data real
- **Gráficos:** Recharts — Receita×Despesa anual, Donut por categoria, projeção 3 meses, saúde financeira
- **Insights automáticos:** alertas de faturas vencidas, projeção de contratos fixos
- Filtro por mês/ano

### Contratos Fixos Mensais
- **Cadastro:** Admin → Configurações → Contratos Fixos Mensais
- Campos: Nome, Cliente, Valor/mês, Dia de vencimento, Data de início, Status (Ativo/Pausado)
- **Geração de cobrança:** Financeiro → Visão Geral ou Aba Receber → botão "⚡ Gerar cobrança" cria transação `arec` com categoria "Contrato Fixo" e vencimento no dia configurado
- **Controle de duplicatas:** campo `generatedMonths[]` impede gerar duas vezes no mesmo mês
- **Vínculo com projeto:** no Step 4 do formulário de projeto → "🔗 Coberto por contrato fixo" → seleciona contrato → valor preenchido automaticamente → aprovação não gera `arec`

### Agenda / Calendário
- 3 visualizações: **Mês**, **Semana** (com grade de horas), **Dia**
- Sub-views na semana/dia: Compacto / Normal / Expandido / Ocultar vazios
- Feriados nacionais brasileiros destacados
- **Filtros toggle:** Mostrar Feriados / Exibir entregas / Exibir captações / Exibir reuniões
- Tipos de evento: Captação (amarelo) / Entrega (verde) / Fixo (azul) / Evento (laranja) / **Reunião (roxo)**
- Clicar em evento abre **modal de visualização read-only** (com botão ✏️ Editar)
- Próximos eventos na sidebar (view mês)
- CRUD completo com horário

### Orçamentos
- Tabela com colunas: Número (ORC-XXXX) / Título / Cliente+email / Valor / Status badge / Data / Validade / Ações
- 4 cards de métricas: Rascunhos / Enviados / Aprovados / Valor Total
- Busca + filtro por status + toggle Arquivados
- Link de aprovação copiável (🔗) + visualizar PDF (📄)
- Botão "+ Novo Orçamento" navega para `/dashboard/projects?new=1` abrindo o modal automaticamente
- Cliente pode aprovar/reprovar pela URL pública (sem login)

### Painel ADM
- **Gestão de usuários:** convidar, trocar role, permissões granulares por módulo, acesso por etapa do pipeline (stageAccess)
- **Freelancers:** cadastro com área, diária, contato
- **Empresas de locação:** cadastro + histórico automático de uso (calculado dos projetos)
- **Configurações customizáveis:** captações, tipos de projeto, segmentos, categorias financeiras, categorias de custo, status do pipeline, **Contratos Fixos Mensais**
- **Backup:** gera arquivo JSON com todos os dados da empresa
- **Seed/Clear:** popular banco com dados de teste ou limpar tudo

### Sistema Global
- **Toast notifications** (`lib/toast.tsx`): sucesso/erro/info, bottom-right, auto-dismiss 3.5s
- **Empty states:** telas amigáveis quando não há dados em nenhuma seção
- **Mobile responsivo:** sidebar colapsável com hamburger em telas < 768px
- **Dark theme:** paleta consistente (#0a0a0a fundo, #f0ece4 texto, #e8c547 âmbar)

---

## 10. Design System

### Cores principais
```
#0a0a0a  → fundo principal
#111111  → sidebar
#111318  → cards/painéis
#1a1d24  → inputs
#2a2d35  → bordas
#f0ece4  → texto principal
#888888  → texto secundário
#4b5563  → texto terciário/labels
#e8c547  → âmbar (ações primárias, destaques)
#5db87a  → verde (sucesso, entregue)
#e85d4a  → vermelho (erro, excluir)
#5b9bd5  → azul (info, orçamento)
#e8924a  → laranja (a pagar, produção)
#9b8fd5  → roxo (edição)
```

### Fontes
- **Syne** (700/800): títulos, valores monetários, botões primários
- **DM Sans** (300/400/500): corpo de texto, labels, inputs

### Status de Projetos
```
orcamento             → #5b9bd5  (Orçamento)
para_captacao         → #e8c547  (Aprovado)
producao              → #e8924a  (Em Produção)
edicao                → #9b8fd5  (Edição)
enviado               → #5b9bd5  (Enviado)
entregue              → #5db87a  (Finalizado)
pausado               → #555555  (Pausado)
orcamento_desaprovado → #e85d4a  (Reprovado)
```

---

## 11. Como Usar o Backup para Migração

1. No Painel ADM → clique em **"Baixar Backup"**
2. Salve o arquivo `.json` gerado
3. O arquivo contém todos os dados organizados por tabela
4. Para restaurar em outro Supabase:
   - Execute todas as migrações (seção 6)
   - Compartilhe o JSON com uma IA e peça: *"Gere os INSERT SQL para o Supabase com esses dados"*
   - Execute os INSERTs no SQL Editor do novo projeto

---

## 12. Como Reproduzir do Zero

1. **Criar projeto Next.js:**
   ```bash
   npx create-next-app@latest mov-gestao-saas --typescript --app
   ```

2. **Instalar dependências:**
   ```bash
   npm install @supabase/ssr @supabase/supabase-js
   ```

3. **Criar projeto no Supabase** e executar as migrações na ordem (seção 6)

4. **Configurar `.env.local`** com as 3 variáveis (seção 3)

5. **Implementar** seguindo a estrutura de arquivos (seção 8) e funcionalidades (seção 9)

6. **Deploy no Vercel:**
   ```bash
   git push origin main
   ```
   Adicionar variáveis de ambiente no Vercel → Settings → Environment Variables

7. **Configurar Supabase Auth:**
   - Authentication → URL Configuration → Site URL = URL da produção

---

## 13. Histórico de Implementações

| Data | Commit | O que foi feito |
|------|--------|-----------------|
| 2026-03-29 | `695efc2` | Google Analytics, WhatsApp pré-preenchido |
| 2026-03-29 | `70f5523` | Tag canonical no head |
| 2026-03-29 | `e41de18` | Galeria de fotos e seção de estúdio |
| 2026-03-29 | `e45cdac` | SEO: H1/H2, canonical, bloco de 300 palavras |
| 2026-03-30 | `5b68276` | Mobile responsivo, clientes com detalhe, financeiro reorganizado, custos Freela, aprovação → arec, orçamentos clicáveis, concluídos, dashboard A Pagar Mês |
| 2026-03-30 | `c07d5d5` | Middleware resiliente a env vars ausentes |
| 2026-03-30 | `fe14657` | Loading state com feedback visual |
| 2026-03-30 | `46b0d93` | Renomeia middleware.ts → proxy.ts (Next.js 16) |
| 2026-03-30 | `8f13f12` | Toast global, pontos no calendário, empty states |
| 2026-04-02 | —       | Locadoras: histórico read-only calculado dos projetos |
| 2026-04-02 | —       | Backup do banco: API + botão no Painel ADM |
| 2026-04-04 | —       | Financeiro: redesign completo com Recharts, KPIs, aging, insights |
| 2026-04-04 | —       | Projetos: pipeline status novo (producao/edicao/aguardando_cliente/revisao/aprovado/finalizado), NF 5%, inline freela, urgência, acesso por etapa, comentários |
| 2026-04-04 | —       | Migration 011: atualiza CHECK constraint de status no banco |
| 2026-04-04 | —       | UserManagement: acesso por etapa (stageAccess) configurável por usuário |
| 2026-04-04 | —       | CompanySettings: lista de Status do Projeto editável |
| 2026-04-04 | —       | Fontes: Montserrat como fonte principal em todo o sistema (substitui DM Sans + Syne) |
| 2026-04-04 | —       | Agenda: redesign completo (3 views: Mês/Semana/Dia, feriados nacionais, filtros toggle, sub-views hora) |
| 2026-04-04 | —       | Permissões: sidebar oculta itens sem acesso; redireciona páginas proibidas; Clientes respeita create/edit/delete |
| 2026-04-04 | —       | Finance: campo de data ao marcar recebido/pago |
| 2026-04-04 | —       | Projetos: campo Tipo virou select com opções do CompanySettings |
| 2026-04-04 | —       | Logo: fallback "MOV" em texto quando arquivo /public/img/logo.png não existe |
