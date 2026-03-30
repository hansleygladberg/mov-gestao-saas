// Endpoint PÚBLICO — sem autenticação — para aprovação de orçamentos
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const admin = createAdminClient()

  const { data, error } = await admin
    .from('projects')
    .select('id, name, type, value, delivery_date, description, data, status, quote_token, clients(name, email)')
    .eq('quote_token', token)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const { action } = await request.json() // action: 'approve' | 'reject'

  if (!['approve', 'reject'].includes(action)) {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  const admin = createAdminClient()

  const { data: project } = await admin
    .from('projects')
    .select('id, status')
    .eq('quote_token', token)
    .single()

  if (!project) return NextResponse.json({ error: 'Orçamento não encontrado' }, { status: 404 })

  if (project.status !== 'orcamento') {
    return NextResponse.json({ error: 'Este orçamento já foi processado' }, { status: 409 })
  }

  const newStatus = action === 'approve' ? 'producao' : 'orcamento_desaprovado'

  const { error } = await admin
    .from('projects')
    .update({ status: newStatus })
    .eq('id', project.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, status: newStatus })
}
