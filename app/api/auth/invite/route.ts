import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { email, name, password, role, companyId, permissions } = await request.json()

    if (!email || !password || !companyId) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    // Verificar se o caller é admin (usando client normal com cookie de sessão)
    const supabase = await createClient()
    const { data: { user: caller } } = await supabase.auth.getUser()
    if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: callerData } = await supabase
      .from('users').select('role, company_id').eq('id', caller.id).single()

    if (!callerData || callerData.role !== 'admin' || callerData.company_id !== companyId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    // Usar admin client para criar o usuário (bypass RLS)
    const admin = createAdminClient()

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) return NextResponse.json({ error: authError.message }, { status: 500 })
    if (!authData.user) return NextResponse.json({ error: 'Erro ao criar usuário' }, { status: 500 })

    const { error: userError } = await admin.from('users').insert([{
      id: authData.user.id,
      email,
      name: name || null,
      company_id: companyId,
      role: role || 'editor',
      permissions: permissions || null,
      invited_by: caller.id,
      is_active: true,
    }])

    if (userError) {
      await admin.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: userError.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Usuário criado com sucesso!' }, { status: 201 })

  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
