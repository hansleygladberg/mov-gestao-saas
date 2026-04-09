/**
 * POST /api/projects/[id]/sync-finance
 *
 * Sincroniza o estado financeiro de um projeto com a tabela transactions.
 * Remove todas as transações vinculadas ao projeto e recria com base
 * no estado atual dos pgtos (rec=true → entrada, rec=false → arec),
 * custos e diárias.
 *
 * Útil para projetos aprovados antes da implementação do fluxo automático.
 */
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

  // Carregar projeto
  const { data: proj, error: projErr } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('company_id', companyId)
    .single()
  if (projErr || !proj) return NextResponse.json({ error: projErr?.message || 'Projeto não encontrado' }, { status: 404 })

  // Carregar freelancers da empresa
  const { data: freelancers } = await supabase
    .from('freelancers')
    .select('*')
    .eq('company_id', companyId)

  // Remover todas as transações vinculadas a este projeto
  const { error: delErr } = await supabase
    .from('transactions')
    .delete()
    .eq('company_id', companyId)
    .eq('project_id', id)
  if (delErr) return NextResponse.json({ error: 'Erro ao limpar transações: ' + delErr.message }, { status: 500 })

  const today = new Date().toISOString().split('T')[0]
  const txs: object[] = []

  // Custos → A Pagar
  for (const c of proj.data?.custos || []) {
    if (Number(c.v) > 0) {
      const freeName = c.freelancerId
        ? (freelancers || []).find((f: { id: string; name: string }) => f.id === c.freelancerId)?.name
        : null
      txs.push({
        type: 'apag',
        value: c.v,
        description: `${c.cat ? `[${c.cat}] ` : ''}${freeName || c.d} — ${proj.name}`,
        category: c.cat || 'Produção',
        transaction_date: today,
        project_id: id,
      })
    }
  }

  // Diárias → A Pagar
  for (const d of proj.data?.diarias || []) {
    const total = Number(d.qtd || 1) * Number(d.v || 0)
    if (total > 0) {
      txs.push({
        type: 'apag',
        value: total,
        description: `${d.desc} ×${d.qtd} — ${proj.name}`,
        category: 'Locação',
        transaction_date: today,
        project_id: id,
      })
    }
  }

  // Freelancers (freeIds) → A Pagar
  for (const fid of proj.data?.freeIds || []) {
    const fl = (freelancers || []).find((f: { id: string; name: string; daily_rate?: number }) => f.id === fid)
    if (fl) {
      txs.push({
        type: 'apag',
        value: fl.daily_rate || 0,
        description: `Freelancer: ${fl.name} — ${proj.name}`,
        category: 'Freela',
        transaction_date: today,
        project_id: id,
      })
    }
  }

  // Recebimentos:
  //   rec=true  → entrada (já recebido, entra no caixa)
  //   rec=false → arec   (a receber)
  if (!proj.data?.isContract) {
    for (const pg of proj.data?.pgtos || []) {
      if (Number(pg.v) <= 0) continue
      const baseValue = Number(pg.v)
      const netValue = proj.data?.hasNF ? Math.round(baseValue * 0.95) : baseValue
      const taxValue = baseValue - netValue

      if (pg.rec) {
        // Já recebido → entrada no caixa
        txs.push({
          type: 'entrada',
          value: netValue,
          description: `${pg.d || 'Pagamento'} — ${proj.name}`,
          category: 'Projeto',
          transaction_date: pg.dt || today,
          project_id: id,
        })
        if (taxValue > 0) {
          txs.push({
            type: 'saida',
            value: taxValue,
            description: `Imposto NF (5%) — ${proj.name}`,
            category: 'Imposto',
            transaction_date: pg.dt || today,
            project_id: id,
          })
        }
      } else {
        // Ainda não recebido → a receber
        txs.push({
          type: 'arec',
          value: netValue,
          description: `${pg.d || 'Pagamento'} — ${proj.name}`,
          category: 'Projeto',
          transaction_date: pg.dt || today,
          project_id: id,
        })
        if (taxValue > 0) {
          txs.push({
            type: 'saida',
            value: taxValue,
            description: `Imposto NF (5%) — ${proj.name}`,
            category: 'Imposto',
            transaction_date: pg.dt || today,
            project_id: id,
          })
        }
      }
    }
  }

  if (txs.length > 0) {
    const { error: insErr } = await supabase
      .from('transactions')
      .insert(txs.map(tx => ({ ...tx, company_id: companyId })))
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, synced: txs.length })
}
