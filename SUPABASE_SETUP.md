# Configurar Supabase para Autenticação

## 1. Criar Conta Supabase

1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Sign up com seu email/GitHub
4. Crie uma nova organização (ex: "MOV Produtora")

## 2. Criar Novo Projeto

1. Clique em "New Project"
2. Preenchaa informações:
   - **Name**: mov-gestao
   - **Database Password**: Guarde bem (você não consegue recuperar)
   - **Region**: Escolha a mais próxima (ex: `sa-east-1` para São Paulo)
3. Aguarde ~2 minutos para criação

## 3. Copiar Credenciais

1. Vá em **Project Settings** > **API**
2. Copie:
   - **Project URL** (ex: `https://xxxx.supabase.co`)
   - **anon public** (a chave pública)
3. Cole no arquivo `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
```

## 4. Executar Migrations

1. Vá em **SQL Editor** no Supabase
2. Clique em "New query"
3. Copie o conteúdo de `supabase/migrations/001_initial_schema.sql`
4. Cole na query e clique "Run"
5. Aguarde conclusão

## 5. ⚙️ Configurar Email Provider (Importante!)

Por padrão, Supabase usa SMTP básico. Para confirmação de email funcionar:

1. Vá em **Authentication** > **Providers**
2. Clique em **Email**
3. Se quiser usar seu próprio SMTP:
   - Vá em **Settings** > **Email Templates**
   - Configure ou use o padrão

## 6. 🔒 Configurar RLS Policies (Opcional, já está feito)

1. Vá em **Authentication** > **Enable RLS**
2. Clique em cada tabela e revise as policies criadas

## 7. Testar Localmente

```bash
# 1. Instale dependências
npm install

# 2. Preencha .env.local com suas credenciais

# 3. Rode o projeto
npm run dev

# 4. Visite http://localhost:3000
# Clique em "Criar conta" e faça signup

# 5. Verifique se a empresa e o usuário foram criados:
# - Supabase > SQL Editor > SELECT * FROM companies;
# - SELECT * FROM users;
```

## 🐛 Troubleshooting

### "Invalid API key" ou "Connection refused"

- Verifica se as variáveis de ambiente estão preenchidas
- Confirma se copou URL e chave corretas

### Usuário criado mas não consegue entrar

- Supabase pode exigir confirmação de email
- Vá em **Authentication** > **Users** e confirme manualmente

### Migrations não rodaram

- SqlError (42P07): Uma tabela já existe
- Limpe com `DROP TABLE IF EXISTS` antes de rerun

## 📧 Email (Importante para Signup/Password Reset)

Para enviar emails de confirmação:

1. **Opção 1**: Usar email padrão do Supabase (básico)
2. **Opção 2**: Usar SendGrid, Mailgun, etc
   - Vá em **Authentication** > **Email** > **SMTP Settings**
   - Configure suas credenciais

## ✅ Checklist

- [ ] Conta Supabase criada
- [ ] Projeto criado
- [ ] Credenciais copiadas em `.env.local`
- [ ] Migrations executadas
- [ ] Email configurado (opcional mas recomendado)
- [ ] `npm run dev` funcionando
- [ ] Signup > Usuário criado em `companies` e `users`
- [ ] Login > Redireciona para dashboard

---

Próximas funcionalidades a integrar:
- [ ] CRUD de Projetos
- [ ] CRUD de Clientes
- [ ] Financeiro
- [ ] Calendário
