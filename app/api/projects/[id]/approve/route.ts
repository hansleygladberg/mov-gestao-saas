import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

async function getCompanyId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('company_id').eq('id', user.id).single()
  return data?.company_id || null
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const companyId = await getCompanyId(supabase)
  if (!companyId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Load the project
  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .select('*, clients(name)')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()
  if (projErr || !proj) return NextResponse.json({ error: projErr?.message || 'Projeto não encontrado' }, { status: 404 })

  // Load freelancers for the company
  const { data: freelancers } = await supabase
    .from('freelancers')
    .select('*')
    .eq('company_id', companyId)

  // Update project status to 'producao'
  const { error: updateErr } = await supabase
    .from('projects')
    .update({ status: 'producao', updated_at: new Date().toISOString() })
    .eq('id', id)
  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  const today = new Date().toISOString().split('T')[0]
  const txs: object[] = []

  // Custos → A Pagar
  for (const c of proj.data?.custos || []) {
    if (Number(c.v) > 0) {
      const freeName = c.freelancerId ? (freelancers || []).find((f: { id: string; name: string }) => f.id === c.freelancerId)?.name : null
      txs.push({ type: 'apag', value: c.v, description: `${c.cat ? `[${c.cat}] ` : ''}${freeName || c.d} — ${proj.name}`, category: c.cat || 'Produção', transaction_date: today, project_id: id })
    }
  }

  // Diárias → A Pagar
  for (const d of proj.data?.diarias || []) {
    const total = Number(d.qtd || 1) * Number(d.v || 0)
    if (total > 0) txs.push({ type: 'apag', value: total, description: `${d.desc} ×${d.qtd} — ${proj.name}`, category: 'Locação', transaction_date: today, project_id: id })
  }

  // Freelancers (freeIds) → A Pagar
  for (const fid of proj.data?.freeIds || []) {
    const fl = (freelancers || []).find((f: { id: string; name: string; daily_rate?: number }) => f.id === fid)
    if (fl) txs.push({ type: 'apag', value: fl.daily_rate || 0, description: `Freelancer: ${fl.name} — ${proj.name}`, category: 'Freela', transaction_date: today, project_id: id })
  }

  // Recebimentos (pgtos):
  //   rec=true  → entrada (já recebido)
  //   rec=false → arec   (a receber)
  if (!proj.data?.isContract) {
    for (const pg of proj.data?.pgtos || []) {
      if (Number(pg.v) <= 0) continue
      const baseValue = Number(pg.v)
      const netValue = proj.data?.hasNF ? Math.round(baseValue * 0.95) : baseValue
      const taxValue = baseValue - netValue
      const txType = pg.rec ? 'entrada' : 'arec'
      txs.push({ type: txType, value: netValue, description: `${pg.d || 'Pagamento'} — ${proj.name}`, category: 'Projeto', transaction_date: pg.dt || today, project_id: id })
      if (taxValue > 0) {
        txs.push({ type: 'saida', value: taxValue, description: `Imposto NF (5%) — ${proj.name}`, category: 'Imposto', transaction_date: pg.dt || today, project_id: id })
      }
    }
  }

  // Insert all transactions
  if (txs.length > 0) {
    const { error: txErr } = await supabase.from('transactions').insert(txs.map(tx => ({ ...tx, company_id: companyId })))
    if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })
  }

  // Sync calendar events: delete existing then recreate
  await supabase.from('events').delete().eq('company_id', companyId).eq('project_id', id)

  const evts: object[] = []
  for (let i = 0; i < (proj.data?.dCapt || []).length; i++) {
    const d = (proj.data?.dCapt || [])[i]
    if (!d) continue
    const t = (proj.data?.dCaptTimes || [])[i] || ''
    evts.push({ title: `📷 ${proj.name}`, event_date: d, event_time: t || null, event_type: 'capt', notes: `Projeto: ${proj.name}`, project_id: id, company_id: companyId })
  }
  if (proj.delivery_date) {
    evts.push({ title: `🎬 Entrega: ${proj.name}`, event_date: proj.delivery_date.split('T')[0], event_type: 'entrega', notes: `Entrega do projeto: ${proj.name}`, project_id: id, company_id: companyId })
  }
  if (evts.length > 0) {
    const { error: evtErr } = await supabase.from('events').insert(evts)
    if (evtErr) return NextResponse.json({ error: evtErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, status: 'producao' })
}
