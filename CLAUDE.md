# MOV Gestão SaaS - Development Guide

## 🎯 Visão Geral

Projeto SaaS de gestão para produtoras audiovisuais com suporte multi-tenant, autenticação e níveis de acesso.

**Stack**: Next.js 15 | TypeScript | Tailwind | Supabase | Vercel

## 🚀 Setup Inicial

```bash
npm install
cp .env.local.example .env.local
# Preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
npm run dev
```

## 📁 Estrutura

```
app/
├── api/                 # API routes
├── (auth)/              # Rotas públicas (login, signup)
├── dashboard/           # Dashboard protegido
└── layout.tsx

lib/
├── supabase.ts         # Cliente DB
├── types.ts            # Types do banco
└── auth.ts             # Helpers de autenticação

supabase/migrations/    # Scripts SQL
```

## 🔑 Próximas Etapas (Prioridade)

1. **Autenticação** (Login/Signup com Supabase Auth)
   - Criar página de login
   - Criar página de signup
   - Implementar middleware de proteção de rota
   - Setup de RLS policies robustas

2. **Dashboard**
   - Layout principal
   - Migrar componentes do MOV Gestão (HTML/JS → React)
   - Componentes: KPIs, Cards, Tabelas

3. **CRUD de Projetos**
   - API routes para criar/ler/atualizar/deletar
   - Página de listagem
   - Modal de criação
   - Integração com Supabase

4. **Outras Entidades**
   - Clientes
   - Financeiro
   - Eventos
   - Freelancers

5. **Deploy**
   - Conectar GitHub repo ao Vercel
   - Configurar variáveis de ambiente
   - Setup de CI/CD

## 💡 Convenções

- **Componentes**: `app/(auth)/login/page.tsx` (Server by default, use 'use client' se necessário)
- **Types**: Sempre usar TypeScript, adicionar no `lib/types.ts`
- **Supabase**: Sempre usar `company_id` para filtrar dados (multi-tenant)
- **Styles**: Usar Tailwind, consistência com cores (blue=primary, red=danger, etc)

## 🔐 Autenticação & Autorização

### Roles

- `admin`: Acesso total
- `editor`: Pode criar/editar conteúdo
- `viewer`: Apenas leitura

### RLS Policies

Todas as tabelas têm RLS habilitado. Usuários só veem dados da sua empresa via `company_id`.

## 🌐 Ambiente

- **Local**: `localhost:3000`
- **Staging**: (Vercel preview)
- **Production**: (Vercel production)

### Variáveis Obrigatórias

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 📚 Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [Tailwind CSS](https://tailwindcss.com)

---

**Last Updated**: 2025-03-29
