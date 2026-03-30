import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, companyName } = await request.json()

  if (!email || !password || !companyName) {
    return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
  }

  // Usar admin client (service role) para bypass do RLS durante o cadastro
  const admin = createAdminClient()

  try {
    // 1. Criar empresa
    const { data: company, error: companyError } = await admin
      .from('companies')
      .insert([{ name: companyName }])
      .select()
      .single()

    if (companyError) {
      console.error('Erro ao criar empresa:', companyError)
      return NextResponse.json({ error: companyError.message }, { status: 500 })
    }

    // 2. Criar usuário no Auth
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirma email automaticamente (sem precisar clicar no link)
    })

    if (authError) {
      // Rollback: deletar empresa criada
      await admin.from('companies').delete().eq('id', company.id)
      console.error('Erro ao criar auth:', authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    if (!authData.user) {
      await admin.from('companies').delete().eq('id', company.id)
      return NextResponse.json({ error: 'Usuário não foi criado' }, { status: 500 })
    }

    // 3. Criar registro na tabela users com permissões de admin
    const adminPermissions = {
      projetos: { view: true, create: true, edit: true, delete: true },
      clientes: { view: true, create: true, edit: true, delete: true },
      financeiro: { view: true, create: true, edit: true, delete: true },
      relatorios: { view: true },
      freelancers: { view: true, create: true, edit: true, delete: true },
      adm: { view: true },
    }

    const { error: userError } = await admin.from('users').insert([{
      id: authData.user.id,
      email,
      company_id: company.id,
      role: 'admin',
      is_active: true,
      permissions: adminPermissions,
    }])

    if (userError) {
      // Rollback
      await admin.auth.admin.deleteUser(authData.user.id)
      await admin.from('companies').delete().eq('id', company.id)
      console.error('Erro ao criar user record:', userError)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Conta criada com sucesso!' }, { status: 201 })

  } catch (error) {
    console.error('Erro no signup:', error)
    return NextResponse.json({ error: 'Erro interno ao criar conta' }, { status: 500 })
  }
}
