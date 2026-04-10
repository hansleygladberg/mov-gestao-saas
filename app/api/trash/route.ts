import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id || null
}

// GET - listar itens deletados
export async function GET() {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [projectsRes, clientsRes] = await Promise.all([
    supabase.from('projects').select('id, name, status, value, deleted_at, clients(name)').eq('company_id', companyId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
    supabase.from('clients').select('id, name, email, whatsapp, deleted_at').eq('company_id', companyId).not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
  ])

  return NextResponse.json({
    projects: projectsRes.data || [],
    clients: clientsRes.data || [],
  })
}

// POST - restaurar item
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, id } = await request.json()

  if (type === 'project') {
    const { error } = await supabase.from('projects').update({ deleted_at: null }).eq('id', id).eq('company_id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (type === 'client') {
    const { error } = await supabase.from('clients').update({ deleted_at: null }).eq('id', id).eq('company_id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

// DELETE - excluir permanentemente
export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { type, id } = await request.json()

  if (type === 'project') {
    const { error } = await supabase.from('projects').delete().eq('id', id).eq('company_id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else if (type === 'client') {
    const { error } = await supabase.from('clients').delete().eq('id', id).eq('company_id', companyId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
