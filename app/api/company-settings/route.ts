import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

const DEFAULT_SETTINGS = {
  captacoes: ['Tráfego', 'Site', 'Google', 'Indicação'],
  tiposProjeto: ['Corporativo', 'Evento', 'Institucional', 'Casamento', 'Publicitário', 'Redes Sociais', 'Documentário', 'Making Of', 'Drone'],
  segmentos: ['Saúde', 'Advocacia', 'Educação', 'Eventos', 'Governo', 'Corporativo', 'Casamento', 'Gastronomia', 'Fitness', 'Outro'],
  categoriasFinanceiras: ['Projeto', 'Equipamento', 'Freelancer', 'Software', 'Transporte', 'Alimentação', 'Estacionamento', 'Aluguel Equipamento', 'Marketing', 'Outro'],
}

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id || null
}

export async function GET() {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('companies')
    .select('settings')
    .eq('id', companyId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const settings = (data?.settings && Object.keys(data.settings).length > 0)
    ? data.settings
    : DEFAULT_SETTINGS

  return NextResponse.json(settings)
}

export async function PUT(request: NextRequest) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const { data, error } = await supabase
    .from('companies')
    .update({ settings: body })
    .eq('id', companyId)
    .select('settings')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data.settings)
}
