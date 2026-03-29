# ⚙️ Setup do Supabase

## 1️⃣ Criar Project no Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em **"New Project"**
3. Preencha:
   - **Project Name**: mov-gestao-saas
   - **Database Password**: guarde em local seguro!
   - **Region**: São Paulo (sa-east-1)
   - **Pricing Plan**: Free
4. Clique em **"Create new project"** e aguarde (~2 min)

## 2️⃣ Obter Credenciais

### URL e Anon Key

1. No dashboard, vá para **Settings** (ícone de engrenagem, canto inferior esquerdo)
2. Clique em **"API"**
3. Copie:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### .env.local

Crie o arquivo `.env.local` na raiz do projeto:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 3️⃣ Executar as Migrations

1. No dashboard do Supabase, vá para **SQL Editor**
2. Clique em **"New Query"** ou **"New Snippet"**
3. Copie TODO o conteúdo do arquivo: `supabase/migrations/001_initial_schema.sql`
4. Cole no SQL Editor e execute (play button)

✅ Se aparecer "Success", as tabelas foram criadas!

## 4️⃣ Ativar Autenticação por Email

1. No dashboard, vá para **Authentication**
2. Clique em **"Providers"**
3. Verifique se "Email" está ativado (deve estar por padrão)

## 5️⃣ Configurar Email (Opcional, mas Importante)

Para production, configure um serviço de email:

1. Em **Authentication** → **Email Templates**
2. Você pode usar o serviço padrão do Supabase (50 emails/mês free)
3. Ou configurar seu próprio SMTP

## 6️⃣ Testar Localmente

```bash
npm run dev
```

Acesse: http://localhost:3000/signup

Crie uma conta de teste!

## 7️⃣ RLS (Row Level Security)

✅ Já está configurado na migration!

Cada usuário só vê dados da sua company. Teste em **SQL Editor**:

```sql
SELECT * FROM companies;
SELECT * FROM users;
SELECT * FROM projects;
```

Se retornar vazio, é normal - você não está autenticado. A RLS funciona!

## 🔧 Troubleshooting

### ❌ "Cannot execute query - not authenticated"

Isso é esperado! Significa que as RLS policies estão funcionando.

Para testar via SQL Editor, desative RLS temporariamente em **Settings → Policies** (apenas para debug!).

### ❌ "Invalid UUID"

A função `get_current_company_id()` precisa de um usuário autenticado no JWT.

Isso é padrão - use apenas via aplicação (onde o JWT está disponível).

### ❌ Erro ao fazer login

1. Verifique se `.env.local` tem as credenciais corretas
2. Confirme que o email de teste foi criado em **Auth Users**
3. Veja o console do navegador (F12) para mais detalhes

## 📚 Próximos Passos

1. ✅ Migrations criadas
2. ✅ Auth configurado
3. 🎯 Criar protected pages (middleware)
4. 🎯 Implementar CRUD de projetos
5. 🎯 Criar dashboard com dados

---

**Dúvidas?** Veja os docs:
- [Supabase Docs](https://supabase.com/docs)
- [Supabase Auth](https://supabase.com/docs/guides/auth/overview)
- [RLS Policies](https://supabase.com/docs/guides/auth/row-level-security)
