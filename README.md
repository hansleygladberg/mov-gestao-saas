# MOV Gestão SaaS

Ferramenta de gestão de projetos, financeiro e clientes para produtoras audiovisuais. Multi-tenant com autenticação.

## Stack

- **Frontend**: Next.js 15 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL) + Neon (backup)
- **Auth**: Supabase Auth + custom RBAC (Role-Based Access Control)
- **Deploy**: Vercel

## Configuração Local

### 1. Instalar dependências

```bash
npm install
```

### 2. Criar conta Supabase

1. Vá para [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Copie as credenciais na aba "Project Settings" > "API"

### 3. Configurar variáveis de ambiente

Copie `.env.local.example` para `.env.local` e preencha:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

### 4. Setup do banco de dados

Execute as migrations no SQL Editor do Supabase em `supabase/migrations/`.

### 5. Rodar localmente

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

## Estrutura do Projeto

```
app/
├── api/                     # API routes
│   ├── auth/               # Autenticação
│   └── projects/           # CRUD de projetos
├── (auth)/                 # Grupo de rotas públicas
│   ├── login/
│   └── signup/
├── dashboard/              # Dashboard principal (protegido)
├── layout.tsx
└── page.tsx               # Home pública

lib/
├── supabase.ts            # Cliente Supabase
├── types.ts               # TypeScript types
└── auth.ts                # Helpers de auth

supabase/
└── migrations/            # Scripts SQL

public/                    # Imagens, assets
```

## Banco de Dados

### Tabelas

- **companies** - Empresas/Workspaces (multi-tenant)
- **users** - Usuários com roles
- **projects** - Projetos
- **clients** - Clientes
- **transactions** - Lançamentos financeiros
- **events** - Eventos de calendário

### RLS (Row Level Security)

Todos os dados são filtrados por `company_id`. Usuários só veem dados da sua empresa.

## Autenticação & Autorização

### Roles

- **admin**: Acesso total, pode gerenciar usuários
- **editor**: Pode criar/editar projetos, clientes, financeiro
- **viewer**: Apenas leitura

## Deploy na Vercel

```bash
# Conectar repo no GitHub e depois no Vercel
# https://vercel.com/new
```

---

Made with 💜 by MOV Produtora
