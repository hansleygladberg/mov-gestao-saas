'use client'

import { useState, useEffect, useCallback } from 'react'

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
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [form, setForm] = useState<Partial<Transaction>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [categories, setCategories] = useState<string[]>([])

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear, setSelYear] = useState(now.getFullYear())

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

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
    if (!form.description?.trim()) { showToast('Informe a descrição'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/transactions/${editing.id}` : '/api/transactions'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load(); setShowModal(false); showToast(editing ? 'Atualizado!' : 'Criado!')
    } catch (e: unknown) { showToast('Erro: ' + (e instanceof Error ? e.message : 'Erro')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta transação?')) return
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    await load(); showToast('Excluído')
  }

  async function handleConfirm(t: Transaction) {
    const newType = t.type === 'arec' ? 'entrada' : 'saida'
    await fetch(`/api/transactions/${t.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...t, type: newType }) })
    await load()
    showToast(t.type === 'arec' ? 'Marcado como recebido!' : 'Marcado como pago!')
  }

  const years = [selYear - 1, selYear, selYear + 1]

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center', background: '#0d0f12', minHeight: '100vh' }}>Carregando...</div>

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '12px 20px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>{toast}</div>}

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

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '16px' }}>
        {[
          { key: 'todos', label: `Todos (${filtered.length})` },
          { key: 'entrada', label: `Entradas (${filtered.filter(t => t.type === 'entrada').length})` },
          { key: 'saida', label: `Despesas (${filtered.filter(t => t.type === 'saida').length})` },
          { key: 'arec', label: `A Receber (${filtered.filter(t => t.type === 'arec').length})` },
          { key: 'apag', label: `A Pagar (${filtered.filter(t => t.type === 'apag').length})` },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: tab === t.key ? 'rgba(232,197,71,.15)' : '#1a1d24', color: tab === t.key ? '#e8c547' : '#4b5563', transition: 'all .12s' }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Transaction list */}
      {byTab.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4b5563' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>💰</div>
          <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '6px' }}>Nenhuma transação neste período</div>
        </div>
      ) : (
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', overflow: 'hidden' }}>
          {byTab.map((t, i) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: i < byTab.length - 1 ? '1px solid #1f2229' : 'none', gap: '12px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TYPE_COLOR[t.type] || '#555', flexShrink: 0 }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{t.description || '—'}</div>
                <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                  {TYPE_LABEL[t.type]}
                  {t.category ? ` · ${t.category}` : ''}
                  {t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}
                </div>
              </div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: TYPE_COLOR[t.type] || '#f0ece4', flexShrink: 0 }}>
                {(t.type === 'saida' || t.type === 'apag') ? '-' : '+'}{fv(t.value)}
              </div>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                {(t.type === 'arec' || t.type === 'apag') && (
                  <button onClick={() => handleConfirm(t)} style={{ ...btn('green'), padding: '4px 10px', fontSize: '11px' }}>
                    {t.type === 'arec' ? '✓ Recebido' : '✓ Pago'}
                  </button>
                )}
                <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>✏️</button>
                <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '4px 10px', fontSize: '11px' }}>🗑</button>
              </div>
            </div>
          ))}
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
