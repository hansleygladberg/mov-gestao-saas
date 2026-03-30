'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }
function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

interface Transaction {
  id: string
  type: 'entrada' | 'saida' | 'arec' | 'apag'
  value: number
  description?: string
  category?: string
  transaction_date?: string
  created_at: string
}

interface Client {
  id: string
  name: string
  monthly_value?: number
}

const TYPE_LABEL: Record<string, string> = { entrada: 'Entrada', saida: 'Despesa', arec: 'A Receber', apag: 'A Pagar' }
const TYPE_COLOR: Record<string, string> = { entrada: '#5db87a', saida: '#e85d4a', arec: '#5b9bd5', apag: '#e8924a' }

const BLANK = (): Partial<Transaction> => ({
  type: 'entrada', value: 0, description: '', category: '', transaction_date: new Date().toISOString().split('T')[0]
})

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btn = (v: 'primary' | 'ghost' | 'danger' | 'green') => ({ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: v === 'ghost' ? '1px solid #2a2d35' : 'none', background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : v === 'green' ? '#5db87a' : 'transparent', color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : v === 'green' ? '#000' : '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties)

export default function FinancePage() {
  const toast = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState<Partial<Transaction>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [showPayModal, setShowPayModal] = useState(false)
  const [payTx, setPayTx] = useState<Transaction | null>(null)
  const [payAmount, setPayAmount] = useState<number>(0)
  const [showHistorico, setShowHistorico] = useState(false)

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const load = useCallback(async () => {
    setLoading(true)
    const [txRes, clRes, settRes] = await Promise.all([
      fetch('/api/transactions').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/company-settings').then(r => r.json()),
    ])
    setTransactions(Array.isArray(txRes) ? txRes : [])
    setClients(Array.isArray(clRes) ? clRes : [])
    setCategories(settRes?.categoriasFinanceiras || [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // Receita fixa mensal = soma dos monthly_value dos clientes com contrato
  const receitaFixaMensal = clients.filter(c => c.monthly_value && c.monthly_value > 0).reduce((s, c) => s + Number(c.monthly_value), 0)
  const clientesFixos = clients.filter(c => c.monthly_value && c.monthly_value > 0)

  // Filter by selected month/year
  const filtered = transactions.filter(t => {
    if (!t.transaction_date) return false
    const [y, m] = t.transaction_date.split('-')
    return Number(y) === selYear && Number(m) - 1 === selMonth
  })

  const byTab = tab === 'todos' ? filtered : filtered.filter(t => t.type === tab)

  // KPIs do mês selecionado
  const recebido = filtered.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.value), 0)
  const aReceber = filtered.filter(t => t.type === 'arec').reduce((s, t) => s + Number(t.value), 0)
  const despesas = filtered.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
  const aPagar = filtered.filter(t => t.type === 'apag').reduce((s, t) => s + Number(t.value), 0)
  const saldoMes = recebido - despesas

  function openCreate() { setEditing(null); setForm(BLANK()); setShowModal(true) }
  function openEdit(t: Transaction) {
    setEditing(t)
    setForm({ type: t.type, value: t.value, description: t.description || '', category: t.category || '', transaction_date: t.transaction_date || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.description?.trim()) { toast.show('Informe a descrição', 'error'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/transactions/${editing.id}` : '/api/transactions'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load(); setShowModal(false); toast.show(editing ? 'Atualizado!' : 'Criado!', 'success')
    } catch (e: unknown) { toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta transação?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    await load(); toast.show('Excluído', 'success')
  }

  function openPayModal(t: Transaction) {
    setPayTx(t)
    setPayAmount(t.value)
    setShowPayModal(true)
  }

  async function handleConfirmPay() {
    if (!payTx) return
    const newType = payTx.type === 'arec' ? 'entrada' : 'saida'
    await fetch(`/api/transactions/${payTx.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...payTx, type: newType, value: payAmount }),
    })
    await load()
    toast.show(payTx.type === 'arec' ? 'Marcado como recebido!' : 'Marcado como pago!', 'success')
    setShowPayModal(false)
    setPayTx(null)
  }

  const years = [selYear - 1, selYear, selYear + 1]

  // Two-column data
  const arecItems = filtered.filter(t => t.type === 'arec')
  const entradaItems = filtered.filter(t => t.type === 'entrada')
  const apagItems = filtered.filter(t => t.type === 'apag')
  const saidaItems = filtered.filter(t => t.type === 'saida')

  // Gastos por Categoria
  const gastoTxs = [...saidaItems, ...apagItems]
  const gastosPorCat: { cat: string; total: number }[] = []
  gastoTxs.forEach(t => {
    const cat = t.category?.trim() || 'Sem categoria'
    const existing = gastosPorCat.find(g => g.cat === cat)
    if (existing) existing.total += Number(t.value)
    else gastosPorCat.push({ cat, total: Number(t.value) })
  })
  gastosPorCat.sort((a, b) => b.total - a.total)
  const topCats = gastosPorCat.slice(0, 10)
  const maxCatTotal = topCats.length > 0 ? topCats[0].total : 1

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center', background: '#0d0f12', minHeight: '100vh' }}>Carregando...</div>

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Financeiro</h1>
          <p style={{ color: '#4b5563', fontSize: '13px' }}>{MONTHS_FULL[selMonth]} {selYear}</p>
        </div>
        <button onClick={openCreate} style={btn('primary')}>+ Nova Transação</button>
      </div>

      {/* Receita fixa mensal — destaque */}
      {receitaFixaMensal > 0 && (
        <div style={{ background: 'rgba(93,184,122,.06)', border: '1px solid rgba(93,184,122,.2)', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '4px' }}>Receita Fixa Mensal</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, color: '#5db87a' }}>{fv(receitaFixaMensal)}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '6px' }}>{clientesFixos.length} contrato{clientesFixos.length !== 1 ? 's' : ''} fixo{clientesFixos.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {clientesFixos.map(c => (
                <div key={c.id} style={{ fontSize: '11px', color: '#6b7280' }}>{c.name}: <span style={{ color: '#5db87a' }}>{fv(Number(c.monthly_value))}</span></div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Month/Year filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' as const, alignItems: 'center' }}>
        <select style={{ ...inp, width: 'auto', minWidth: '80px' }} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' as const }}>
          {MONTHS.map((m, i) => (
            <button key={i} onClick={() => setSelMonth(i)} style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: selMonth === i ? 'rgba(232,197,71,.15)' : '#1a1d24', color: selMonth === i ? '#e8c547' : '#4b5563', transition: 'all .12s' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '10px', marginBottom: '24px' }}>
        {[
          { label: 'Recebido', value: recebido, color: '#5db87a' },
          { label: 'A Receber', value: aReceber, color: '#5b9bd5' },
          { label: 'Despesas', value: despesas, color: '#e85d4a' },
          { label: 'A Pagar', value: aPagar, color: '#e8924a' },
          { label: 'Saldo do Mês', value: saldoMes, color: saldoMes >= 0 ? '#5db87a' : '#e85d4a' },
        ].map(k => (
          <div key={k.label} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: k.color }}>{fv(k.value)}</div>
          </div>
        ))}
      </div>

      {/* Empty state when no transactions in month */}
      {!loading && filtered.length === 0 && (
        <EmptyState
          icon="$"
          title={`Sem movimentações em ${MONTHS_FULL[selMonth]}`}
          subtitle="Registre entradas e saídas para acompanhar seu financeiro."
          action="+ Nova Transação"
          onAction={() => { setEditing(null); setForm(BLANK()); setShowModal(true) }}
        />
      )}

      {/* Two-column box section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

        {/* LEFT BOX — Contas a Receber */}
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Box header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#5b9bd5' }}>📥 Contas a Receber</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#5b9bd5' }}>{fv(aReceber)}</span>
          </div>

          {/* arec items */}
          <div style={{ padding: '8px 0' }}>
            {arecItems.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '12px', color: '#4b5563', textAlign: 'center' }}>Nenhuma conta a receber</div>
            ) : (
              arecItems.map(t => (
                <div key={t.id} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1d24' }}>
                  <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500, marginBottom: '4px' }}>{t.description || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>
                      {t.category || 'Sem categoria'}{t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}
                    </div>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#5b9bd5' }}>+{fv(t.value)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={() => openPayModal(t)} style={{ ...btn('green'), padding: '4px 10px', fontSize: '11px' }}>✓ Recebido</button>
                    <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>✏️</button>
                    <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '4px 10px', fontSize: '11px' }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Divider */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #1f2229', borderBottom: '1px solid #1a1d24' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>✓ Entradas recebidas</span>
          </div>

          {/* entrada items — compact */}
          <div style={{ padding: '4px 0' }}>
            {entradaItems.length === 0 ? (
              <div style={{ padding: '10px 16px', fontSize: '12px', color: '#4b5563' }}>Nenhuma entrada</div>
            ) : (
              entradaItems.map(t => (
                <div key={t.id} style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1a1d24' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#c0bdb5', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>{t.category || 'Sem categoria'}{t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}</div>
                  </div>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#5db87a', flexShrink: 0 }}>+{fv(t.value)}</span>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '3px 8px', fontSize: '11px' }}>✏️</button>
                    <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '3px 8px', fontSize: '11px' }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>Total entradas</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#5db87a' }}>{fv(recebido)}</span>
          </div>
        </div>

        {/* RIGHT BOX — Contas a Pagar */}
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', overflow: 'hidden' }}>
          {/* Box header */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8924a' }}>📤 Contas a Pagar</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8924a' }}>{fv(aPagar)}</span>
          </div>

          {/* apag items */}
          <div style={{ padding: '8px 0' }}>
            {apagItems.length === 0 ? (
              <div style={{ padding: '16px', fontSize: '12px', color: '#4b5563', textAlign: 'center' }}>Nenhuma conta a pagar</div>
            ) : (
              apagItems.map(t => (
                <div key={t.id} style={{ padding: '10px 16px', borderBottom: '1px solid #1a1d24' }}>
                  <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500, marginBottom: '4px' }}>{t.description || '—'}</div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>
                      {t.category || 'Sem categoria'}{t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}
                    </div>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#e8924a' }}>-{fv(t.value)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button onClick={() => openPayModal(t)} style={{ ...btn('green'), padding: '4px 10px', fontSize: '11px' }}>✓ Pago</button>
                    <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>✏️</button>
                    <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '4px 10px', fontSize: '11px' }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Divider */}
          <div style={{ padding: '8px 16px', borderTop: '1px solid #1f2229', borderBottom: '1px solid #1a1d24' }}>
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>✓ Despesas pagas</span>
          </div>

          {/* saida items — compact */}
          <div style={{ padding: '4px 0' }}>
            {saidaItems.length === 0 ? (
              <div style={{ padding: '10px 16px', fontSize: '12px', color: '#4b5563' }}>Nenhuma despesa</div>
            ) : (
              saidaItems.map(t => (
                <div key={t.id} style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #1a1d24' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#c0bdb5', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#4b5563' }}>{t.category || 'Sem categoria'}{t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}</div>
                  </div>
                  <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#e85d4a', flexShrink: 0 }}>-{fv(t.value)}</span>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '3px 8px', fontSize: '11px' }}>✏️</button>
                    <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '3px 8px', fontSize: '11px' }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '10px 16px', borderTop: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', color: '#4b5563' }}>Total despesas</span>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: '#e85d4a' }}>{fv(despesas)}</span>
          </div>
        </div>
      </div>

      {/* Gastos por Categoria */}
      {topCats.length > 0 && (
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, color: '#f0ece4', marginBottom: '14px' }}>📊 Gastos por Categoria</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {topCats.map(({ cat, total }) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '120px', fontSize: '12px', color: '#c0bdb5', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cat}</div>
                <div style={{ flex: 1, background: '#1a1d24', borderRadius: '4px', height: '6px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#e8924a', borderRadius: '4px', width: `${(total / maxCatTotal) * 100}%`, transition: 'width .3s' }} />
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '12px', color: '#e8924a', flexShrink: 0, minWidth: '70px', textAlign: 'right' }}>{fv(total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Histórico completo — collapsible */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setShowHistorico(v => !v)}
          style={{ ...btn('ghost'), width: '100%', justifyContent: 'space-between', padding: '10px 16px' }}
        >
          <span>Ver histórico completo ({filtered.length})</span>
          <span style={{ fontSize: '11px', color: '#4b5563' }}>{showHistorico ? '▲' : '▼'}</span>
        </button>
        {showHistorico && (
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderTop: 'none', borderRadius: '0 0 10px 10px', overflow: 'hidden' }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>Nenhuma transação neste período</div>
            ) : (
              filtered.map((t, i) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 16px', borderBottom: i < filtered.length - 1 ? '1px solid #1a1d24' : 'none', gap: '10px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: TYPE_COLOR[t.type] || '#555', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '12px', color: '#f0ece4', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '1px' }}>
                      <span style={{ color: TYPE_COLOR[t.type] }}>{TYPE_LABEL[t.type]}</span>
                      {t.category ? ` · ${t.category}` : ''}
                      {t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}
                    </div>
                  </div>
                  <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '13px', color: TYPE_COLOR[t.type] || '#f0ece4', flexShrink: 0 }}>
                    {(t.type === 'saida' || t.type === 'apag') ? '-' : '+'}{fv(t.value)}
                  </div>
                  <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                    <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '3px 8px', fontSize: '11px' }}>✏️</button>
                    <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '3px 8px', fontSize: '11px' }}>🗑</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Pay Modal */}
      {showPayModal && payTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '380px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#f0ece4' }}>
                {payTx.type === 'arec' ? '✓ Confirmar Recebimento' : '✓ Confirmar Pagamento'}
              </h3>
              <button onClick={() => setShowPayModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              <div style={{ marginBottom: '16px', padding: '12px 14px', background: '#0d0f12', borderRadius: '8px', fontSize: '13px', color: '#888' }}>
                {payTx.description || '—'}
                {payTx.transaction_date && <span style={{ marginLeft: '8px', color: '#555' }}>· {fd(payTx.transaction_date)}</span>}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>
                  Valor {payTx.type === 'arec' ? 'Recebido' : 'Pago'} (R$)
                </label>
                <input
                  type="number"
                  autoFocus
                  style={{ ...inp, fontSize: '18px', color: payTx.type === 'arec' ? '#5db87a' : '#e8924a', fontWeight: 700 }}
                  value={payAmount}
                  onChange={e => setPayAmount(Number(e.target.value))}
                  min={0}
                  step={0.01}
                />
                {payAmount !== payTx.value && (
                  <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>
                    Original: {fv(payTx.value)} · Diferença: {fv(payAmount - payTx.value)}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowPayModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleConfirmPay} style={btn('green')}>
                  {payTx.type === 'arec' ? '✓ Marcar Recebido' : '✓ Marcar Pago'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Tipo</label>
                <select style={{ ...inp }} value={form.type || 'entrada'} onChange={e => setForm(p => ({ ...p, type: e.target.value as Transaction['type'] }))}>
                  <option value="entrada">Entrada (recebido)</option>
                  <option value="saida">Despesa (pago)</option>
                  <option value="arec">A Receber</option>
                  <option value="apag">A Pagar</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Descrição *</label>
                <input style={inp} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Pagamento cliente XYZ..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor (R$) *</label>
                  <input type="number" style={inp} value={form.value || ''} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} placeholder="0" min={0} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Data</label>
                  <input type="date" style={inp} value={form.transaction_date || ''} onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Categoria</label>
                {categories.length > 0 ? (
                  <select style={{ ...inp }} value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                    <option value="">— Selecionar —</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                ) : (
                  <input style={inp} value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Marketing, Equipamentos..." />
                )}
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
