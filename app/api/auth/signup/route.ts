import { createServerClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { email, password, companyName } = await request.json()

  if (!email || !password || !companyName) {
    return NextResponse.json(
      { error: 'Dados obrigatórios faltando' },
      { status: 400 }
    )
  }

  try {
    const supabase = createServerClient()

    // 1. Criar company (direto no banco, sem RLS)
    const { data: companyData, error: companyError } = await supabase
      .from('companies')
      .insert([{ name: companyName }])
      .select()
      .single()

    if (companyError) {
      console.error('Erro ao criar company:', companyError)
      return NextResponse.json(
        { error: companyError.message },
        { status: 500 }
      )
    }

    // 2. Criar usuário no Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (authError) {
      console.error('Erro ao criar auth:', authError)
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: 'Usuário não foi criado' },
        { status: 500 }
      )
    }

    // 3. Criar user record
    const { error: userError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          company_id: companyData.id,
          role: 'admin',
        },
      ])

    if (userError) {
      console.error('Erro ao criar user record:', userError)
      return NextResponse.json(
        { error: userError.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Cadastro realizado com sucesso!' },
      { status: 201 }
    )
  } catch (error) {
    console.error('Erro no signup:', error)
    return NextResponse.json(
      { error: 'Erro ao registrar' },
      { status: 500 }
    )
  }
}
