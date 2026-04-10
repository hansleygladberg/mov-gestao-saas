'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid,
} from 'recharts'

// ─── Formatters ──────────────────────────────────────────────────────────────
function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }
function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
function fvK(v: number) { if (Math.abs(v) >= 1000000) return `R$${(v / 1000000).toFixed(1)}M`; if (Math.abs(v) >= 1000) return `R$${(v / 1000).toFixed(0)}k`; return fv(v) }
function pct(v: number) { return isNaN(v) || !isFinite(v) ? '—' : `${v.toFixed(1)}%` }
function delta(curr: number, prev: number) {
  if (!prev) return null
  const d = ((curr - prev) / Math.abs(prev)) * 100
  return { value: d, label: `${d >= 0 ? '↑' : '↓'} ${Math.abs(d).toFixed(0)}% vs mês ant.`, positive: d >= 0 }
}

// ─── Constants ───────────────────────────────────────────────────────────────
const MONTHS     = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

// ─── Interfaces ──────────────────────────────────────────────────────────────
interface Transaction {
  id: string; type: 'entrada' | 'saida' | 'arec' | 'apag'
  value: number; description?: string; category?: string
  transaction_date?: string; client_id?: string; created_at: string
}
interface Client { id: string; name: string; monthly_value?: number }
interface Project {
  id: string; name: string; value: number; client_id?: string
  data?: { custos?: { v: number }[]; diarias?: { qtd: number; v: number }[] }
  clients?: { name: string } | null
}
interface Contract {
  id: string
  name: string
  value: number
  due_day: number
  start_date?: string
  status: 'ativo' | 'pausado' | 'cancelado'
  notes?: string
  generated_months: string[]
  project_id?: string
  client_id?: string
  clients?: { name: string } | null
  projects?: { name: string; status: string } | null
}

const BLANK = (): Partial<Transaction> => ({ type: 'entrada', value: 0, description: '', category: '', transaction_date: new Date().toISOString().split('T')[0], client_id: '' })
const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btn = (v: 'primary' | 'ghost' | 'danger' | 'green' | 'green-solid' | 'red-solid') => {
  const styles: Record<string, React.CSSProperties> = {
    primary:    { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#e8c547', color: '#000', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    ghost:      { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #2a2d35', background: 'transparent', color: '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    danger:     { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.12)', color: '#e85d4a', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    green:      { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: 'none', background: '#5db87a', color: '#000', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    'green-solid': { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,184,122,.15)', color: '#5db87a', display: 'inline-flex', alignItems: 'center', gap: '6px' },
    'red-solid':   { padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.15)', color: '#e85d4a', display: 'inline-flex', alignItems: 'center', gap: '6px' },
  }
  return styles[v] as React.CSSProperties
}

const DONUT_COLORS = ['#e8924a','#5db87a','#5b9bd5','#e8c547','#9b8fd5','#e85d4a','#60c0a0','#d4a373','#7b9ea8','#b0b0b0']

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 14px', fontSize: '12px' }}>
      <div style={{ color: '#888', marginBottom: '6px', fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, marginBottom: '2px' }}>{p.name}: {fv(p.value)}</div>
      ))}
    </div>
  )
}

// ─── Section Label ────────────────────────────────────────────────────────────
const SLabel = ({ children }: { children: React.ReactNode }) => (
  <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '12px' }}>{children}</div>
)

export default function FinancePage() {
  const toast = useToast()
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [clients, setClients]           = useState<Client[]>([])
  const [projects, setProjects]         = useState<Project[]>([])
  const [loading, setLoading]           = useState(true)
  const [showModal, setShowModal]       = useState(false)
  const [editing, setEditing]           = useState<Transaction | null>(null)
  const [form, setForm]                 = useState<Partial<Transaction>>(BLANK())
  const [saving, setSaving]             = useState(false)
  const [categories, setCategories]     = useState<string[]>([])
  const [showPayModal, setShowPayModal] = useState(false)
  const [payTx, setPayTx]               = useState<Transaction | null>(null)
  const [payAmount, setPayAmount]       = useState<number>(0)
  const [payDate, setPayDate]           = useState<string>(new Date().toISOString().split('T')[0])
  const [showHistorico, setShowHistorico] = useState(false)
  const [perms, setPerms] = useState<Record<string, boolean>>({ view: true, create: true, edit: true, delete: true })
  const [activeTab, setActiveTab] = useState<'geral' | 'receber' | 'pagar' | 'contratos' | 'despesas_fixas'>('geral')
  const [showCategoriesModal, setShowCategoriesModal] = useState(false)
  const [contracts, setContracts] = useState<Contract[]>([])
  const [showContractForm, setShowContractForm] = useState(false)
  const [editingContract, setEditingContract] = useState<Contract | null>(null)
  const [contractForm, setContractForm] = useState({ name: '', value: 0, due_day: 5, client_id: '', start_date: '', notes: '', status: 'ativo' })

  // Despesas fixas recorrentes
  interface RecurringExpense {
    id: string; name: string; value: number; category?: string
    due_day: number; status: string; notes?: string; generated_months: string[]
  }
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  const [showExpenseForm, setShowExpenseForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<RecurringExpense | null>(null)
  const [expenseForm, setExpenseForm] = useState({ name: '', value: 0, category: '', due_day: 5, notes: '' })

  // ─── Tab-level filters ────────────────────────────────────────────────────
  const [filterType, setFilterType]       = useState('')
  const [filterCat, setFilterCat]         = useState('')
  const [filterDateStart, setFilterDateStart] = useState('')
  const [filterDateEnd, setFilterDateEnd]     = useState('')
  const [searchArec, setSearchArec]       = useState('')
  const [searchApag, setSearchApag]       = useState('')
  const [arecDateStart, setArecDateStart] = useState('')
  const [arecDateEnd, setArecDateEnd]     = useState('')
  const [apagDateStart, setApagDateStart] = useState('')
  const [apagDateEnd, setApagDateEnd]     = useState('')

  const now = new Date()
  const [selMonth, setSelMonth] = useState(now.getMonth())
  const [selYear,  setSelYear]  = useState(now.getFullYear())
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`

  const load = useCallback(async () => {
    setLoading(true)
    const [txRes, clRes, settRes, prRes, meRes, contractsRes, recExpRes] = await Promise.all([
      fetch('/api/transactions').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/company-settings').then(r => r.json()),
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/me').then(r => r.json()).catch(() => null),
      fetch('/api/contracts').then(r => r.json()).catch(() => []),
      fetch('/api/recurring-expenses').then(r => r.ok ? r.json() : []).catch(() => []),
    ])
    setTransactions(Array.isArray(txRes) ? txRes : [])
    setClients(Array.isArray(clRes) ? clRes : [])
    setCategories(settRes?.categoriasFinanceiras || [])
    setContracts(Array.isArray(contractsRes) ? contractsRes : [])
    setProjects(Array.isArray(prRes) ? prRes : [])
    setRecurringExpenses(Array.isArray(recExpRes) ? recExpRes : [])
    if (meRes?.user?.role !== 'admin' && meRes?.user?.permissions?.financeiro) {
      setPerms(meRes.user.permissions.financeiro as Record<string, boolean>)
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ─── Helper: filter by month/year ────────────────────────────────────────
  function filterByMonth(txs: Transaction[], month: number, year: number) {
    return txs.filter(t => {
      if (!t.transaction_date) return false
      const [y, m] = t.transaction_date.split('-')
      return Number(y) === year && Number(m) - 1 === month
    })
  }

  const filtered     = filterByMonth(transactions, selMonth, selYear)
  const prevMonth    = selMonth === 0 ? 11 : selMonth - 1
  const prevYear     = selMonth === 0 ? selYear - 1 : selYear
  const prevFiltered = filterByMonth(transactions, prevMonth, prevYear)

  // ─── KPIs ─────────────────────────────────────────────────────────────────
  const recebido     = filtered.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.value), 0)
  const aReceber     = filtered.filter(t => t.type === 'arec').reduce((s, t) => s + Number(t.value), 0)
  const despesas     = filtered.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
  const aPagar       = filtered.filter(t => t.type === 'apag').reduce((s, t) => s + Number(t.value), 0)
  const receitaTotal = recebido + aReceber
  const despesaTotal = despesas + aPagar
  const saldoMes     = recebido - despesas
  const lucro        = receitaTotal - despesaTotal
  const margemPct    = receitaTotal > 0 ? (lucro / receitaTotal) * 100 : 0

  const prevRecebido  = prevFiltered.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.value), 0)
  const prevDespesas  = prevFiltered.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
  const prevAReceber  = prevFiltered.filter(t => t.type === 'arec').reduce((s, t) => s + Number(t.value), 0)
  const prevReceita   = prevRecebido + prevAReceber

  const deltaReceita  = delta(receitaTotal, prevReceita)
  const deltaRecebido = delta(recebido, prevRecebido)
  const deltaDespesas = delta(despesaTotal, prevDespesas)

  // ─── Contratos fixos ──────────────────────────────────────────────────────
  const clientesFixos      = clients.filter(c => c.monthly_value && c.monthly_value > 0)
  const receitaFixaMensal  = contracts.filter(c => c.status === 'ativo').reduce((s, c) => s + Number(c.value), 0)

  // ─── Overdue ──────────────────────────────────────────────────────────────
  const today = now.toISOString().split('T')[0]
  const overdueItems = transactions.filter(t =>
    (t.type === 'arec' || t.type === 'apag') && t.transaction_date && t.transaction_date < today
  )
  const overdueArec = overdueItems.filter(t => t.type === 'arec')
  const overdueTotal = overdueItems.reduce((s, t) => s + Number(t.value), 0)

  // ─── Aging buckets ────────────────────────────────────────────────────────
  function agingOf(items: Transaction[]) {
    const nowMs = now.getTime()
    const buckets = { ok: { count: 0, total: 0 }, d15: { count: 0, total: 0 }, d30: { count: 0, total: 0 } }
    items.forEach(t => {
      const v = Number(t.value)
      if (!t.transaction_date || t.transaction_date >= today) { buckets.ok.count++; buckets.ok.total += v; return }
      const diff = Math.floor((nowMs - new Date(t.transaction_date).getTime()) / 86400000)
      if (diff <= 15) { buckets.d15.count++; buckets.d15.total += v }
      else { buckets.d30.count++; buckets.d30.total += v }
    })
    return buckets
  }

  const arecItems    = filtered.filter(t => t.type === 'arec')
  const entradaItems = filtered.filter(t => t.type === 'entrada')
  const apagItems    = filtered.filter(t => t.type === 'apag')
  const saidaItems   = filtered.filter(t => t.type === 'saida')

  const agingArec = agingOf(arecItems)
  const agingApag = agingOf(apagItems)

  // ─── Yearly chart data ────────────────────────────────────────────────────
  const yearData = MONTHS.map((m, i) => {
    const txs = filterByMonth(transactions, i, selYear)
    return {
      mes: m,
      Receita: txs.filter(t => t.type === 'entrada' || t.type === 'arec').reduce((s, t) => s + Number(t.value), 0),
      Despesas: txs.filter(t => t.type === 'saida' || t.type === 'apag').reduce((s, t) => s + Number(t.value), 0),
      Lucro: 0,
    }
  }).map(d => ({ ...d, Lucro: d.Receita - d.Despesas }))

  const ytdReceita  = yearData.slice(0, selMonth + 1).reduce((s, d) => s + d.Receita, 0)
  const ytdDespesas = yearData.slice(0, selMonth + 1).reduce((s, d) => s + d.Despesas, 0)

  // ─── Despesas por categoria (donut) ───────────────────────────────────────
  const gastoTxs = [...saidaItems, ...apagItems]
  const gastosByCat: Record<string, number> = {}
  gastoTxs.forEach(t => {
    const cat = t.category?.trim() || 'Sem categoria'
    gastosByCat[cat] = (gastosByCat[cat] || 0) + Number(t.value)
  })
  const donutData = Object.entries(gastosByCat).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value }))
  const donutTotal = donutData.reduce((s, d) => s + d.value, 0)

  // ─── Fluxo de caixa futuro (6 meses) ─────────────────────────────────────
  const despesaFixaMensal = recurringExpenses.filter(e => e.status === 'ativo').reduce((s, e) => s + Number(e.value), 0)
  const avgDespesas3m = (() => {
    let sum = 0
    for (let i = 1; i <= 3; i++) {
      const m = selMonth - i < 0 ? 12 + (selMonth - i) : selMonth - i
      const y = selMonth - i < 0 ? selYear - 1 : selYear
      const txs = filterByMonth(transactions, m, y)
      sum += txs.filter(t => t.type === 'saida' || t.type === 'apag').reduce((s, t) => s + Number(t.value), 0)
    }
    return sum / 3
  })()

  const futureData = Array.from({ length: 6 }, (_, i) => {
    const m = (selMonth + i) % 12
    const y = selYear + Math.floor((selMonth + i) / 12)
    return { mes: `${MONTHS[m]}/${y.toString().slice(-2)}`, Entradas: receitaFixaMensal, Despesas: Math.max(avgDespesas3m, despesaFixaMensal), isFuture: i > 0 }
  })

  // ─── Receita por cliente ──────────────────────────────────────────────────
  const recPorCliente: Record<string, number> = {}
  transactions.filter(t => t.type === 'entrada').forEach(t => {
    const cl = clients.find(c => c.id === t.client_id)
    const name = cl?.name || (t.description?.split(' ').slice(0, 2).join(' ') || 'Outros')
    recPorCliente[name] = (recPorCliente[name] || 0) + Number(t.value)
  })
  const topClientes = Object.entries(recPorCliente).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const maxCliente  = topClientes[0]?.[1] || 1
  const top2Pct     = topClientes.length >= 2 ? ((topClientes[0][1] + topClientes[1][1]) / (topClientes.reduce((s, c) => s + c[1], 0) || 1)) * 100 : 0

  // ─── Margem por projeto ───────────────────────────────────────────────────
  const margemPorProjeto = projects.filter(p => p.value > 0).map(p => {
    const custos = (p.data?.custos || []).reduce((s, c) => s + Number(c.v), 0)
    const diarias = (p.data?.diarias || []).reduce((s, d) => s + Number(d.v) * Number(d.qtd || 1), 0)
    const desp = custos + diarias
    const margem = p.value > 0 ? ((p.value - desp) / p.value) * 100 : 0
    return { name: (p.clients?.name || p.name).slice(0, 22), margem: Math.max(0, Math.min(100, margem)), valor: p.value }
  }).sort((a, b) => b.margem - a.margem).slice(0, 8)

  // ─── Métricas operacionais ────────────────────────────────────────────────
  const nContratos    = contracts.filter(c => c.status === 'ativo').length
  const recTotal      = recebido + aReceber
  const recExpected   = recTotal + overdueArec.reduce((s, t) => s + Number(t.value), 0)
  const recPct        = recExpected > 0 ? (recebido / recExpected) * 100 : 0
  const despPaid      = despesas
  const despTotal     = despesas + aPagar
  const despPct       = despTotal > 0 ? (despPaid / despTotal) * 100 : 0
  const ticketMedio   = nContratos > 0 ? receitaFixaMensal / nContratos : 0
  const avgProjCost   = projects.length > 0 ? projects.reduce((s, p) => {
    const c = (p.data?.custos || []).reduce((ss, cc) => ss + Number(cc.v), 0)
    const d = (p.data?.diarias || []).reduce((ss, dd) => ss + Number(dd.v) * Number(dd.qtd || 1), 0)
    return s + c + d
  }, 0) / projects.length : 0

  // ─── Insights ─────────────────────────────────────────────────────────────
  type Insight = { icon: string; text: string; color: string }
  const insights: Insight[] = []
  if (deltaReceita && deltaReceita.positive && Math.abs(deltaReceita.value) > 5)
    insights.push({ icon: '🚀', text: `Melhor que ${MONTHS_FULL[prevMonth]}: receita ${pct(deltaReceita.value)} maior`, color: '#5db87a' })
  if (deltaReceita && !deltaReceita.positive && Math.abs(deltaReceita.value) > 10)
    insights.push({ icon: '⚠️', text: `Receita ${pct(Math.abs(deltaReceita.value))} abaixo de ${MONTHS_FULL[prevMonth]}`, color: '#e8924a' })
  if (top2Pct > 60 && topClientes.length >= 2)
    insights.push({ icon: '⚠️', text: `Concentração: ${topClientes[0][0]} e ${topClientes[1][0]} = ${pct(top2Pct)} da receita`, color: '#e8c547' })
  if (overdueArec.length > 0)
    insights.push({ icon: '⏰', text: `${overdueArec.length} fatura${overdueArec.length > 1 ? 's' : ''} a receber em atraso: ${fv(overdueArec.reduce((s, t) => s + Number(t.value), 0))}`, color: '#e85d4a' })
  if (receitaFixaMensal > 0)
    insights.push({ icon: '📅', text: `Projeção próximo mês: ${fv(receitaFixaMensal)} em contratos fixos`, color: '#5b9bd5' })
  if (despesaFixaMensal > 0)
    insights.push({ icon: '💸', text: `Despesas fixas mensais: ${fv(despesaFixaMensal)} em ${recurringExpenses.filter(e => e.status === 'ativo').length} item${recurringExpenses.filter(e => e.status === 'ativo').length !== 1 ? 's' : ''}`, color: '#e8924a' })
  if (insights.length === 0)
    insights.push({ icon: '✅', text: 'Tudo em ordem — nenhum alerta este mês', color: '#5db87a' })

  // ─── CRUD ─────────────────────────────────────────────────────────────────
  function openCreate(preType?: Transaction['type']) {
    setEditing(null)
    setForm({ ...BLANK(), ...(preType ? { type: preType } : {}) })
    setShowModal(true)
  }
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
      const payload = { ...form, client_id: form.client_id || null }
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
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
  async function generateCharge(contract: Contract) {
    const dueDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(contract.due_day).padStart(2,'0')}`
    const r = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'arec',
        value: contract.value,
        description: `${contract.name}${contract.clients?.name ? ` — ${contract.clients.name}` : ''}`,
        category: 'Contrato Fixo',
        transaction_date: dueDate,
      }),
    })
    if (!r.ok) { toast.show('Erro ao gerar cobrança', 'error'); return }
    // Update generated_months in DB
    const updatedMonths = [...(contract.generated_months || []), currentMonthKey]
    await fetch(`/api/contracts/${contract.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generated_months: updatedMonths }),
    })
    await load()
    toast.show(`Cobrança de ${contract.name} gerada!`, 'success')
  }
  async function generateExpense(exp: RecurringExpense) {
    const dueDate = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(exp.due_day).padStart(2,'0')}`
    const r = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'apag',
        value: exp.value,
        description: exp.name,
        category: exp.category || 'Despesa Fixa',
        transaction_date: dueDate,
      }),
    })
    if (!r.ok) { toast.show('Erro ao gerar despesa', 'error'); return }
    const updatedMonths = [...(exp.generated_months || []), currentMonthKey]
    await fetch(`/api/recurring-expenses/${exp.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ generated_months: updatedMonths }),
    })
    await load()
    toast.show(`Despesa "${exp.name}" gerada!`, 'success')
  }

  async function saveExpense() {
    if (!expenseForm.name.trim()) { toast.show('Informe o nome', 'error'); return }
    if (!expenseForm.value) { toast.show('Informe o valor', 'error'); return }
    const url = editingExpense ? `/api/recurring-expenses/${editingExpense.id}` : '/api/recurring-expenses'
    const method = editingExpense ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(expenseForm) })
    if (!r.ok) { toast.show('Erro ao salvar', 'error'); return }
    await load()
    setShowExpenseForm(false)
    setEditingExpense(null)
    setExpenseForm({ name: '', value: 0, category: '', due_day: 5, notes: '' })
    toast.show(editingExpense ? 'Atualizado!' : 'Despesa criada!', 'success')
  }

  async function deleteExpense(id: string) {
    if (!confirm('Excluir esta despesa recorrente?')) return
    await fetch(`/api/recurring-expenses/${id}`, { method: 'DELETE' })
    await load()
    toast.show('Excluído', 'success')
  }

  function openExpenseForm(exp?: RecurringExpense) {
    if (exp) {
      setEditingExpense(exp)
      setExpenseForm({ name: exp.name, value: exp.value, category: exp.category || '', due_day: exp.due_day, notes: exp.notes || '' })
    } else {
      setEditingExpense(null)
      setExpenseForm({ name: '', value: 0, category: '', due_day: 5, notes: '' })
    }
    setShowExpenseForm(true)
  }

  async function saveContract() {
    if (!contractForm.name.trim()) { toast.show('Informe o nome', 'error'); return }
    if (!contractForm.value) { toast.show('Informe o valor', 'error'); return }
    const url = editingContract ? `/api/contracts/${editingContract.id}` : '/api/contracts'
    const method = editingContract ? 'PUT' : 'POST'
    const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...contractForm, client_id: contractForm.client_id || null }) })
    if (!r.ok) { toast.show('Erro ao salvar', 'error'); return }
    await load()
    setShowContractForm(false)
    setEditingContract(null)
    setContractForm({ name: '', value: 0, due_day: 5, client_id: '', start_date: '', notes: '', status: 'ativo' })
    toast.show(editingContract ? 'Contrato atualizado!' : 'Contrato criado!', 'success')
  }

  async function deleteContract(id: string) {
    if (!confirm('Excluir este contrato fixo?')) return
    await fetch(`/api/contracts/${id}`, { method: 'DELETE' })
    await load()
    toast.show('Excluído', 'success')
  }

  function openContractForm(c?: Contract) {
    if (c) {
      setEditingContract(c)
      setContractForm({ name: c.name, value: c.value, due_day: c.due_day, client_id: c.client_id || '', start_date: c.start_date || '', notes: c.notes || '', status: c.status })
    } else {
      setEditingContract(null)
      setContractForm({ name: '', value: 0, due_day: 5, client_id: '', start_date: '', notes: '', status: 'ativo' })
    }
    setShowContractForm(true)
  }

  function openPayModal(t: Transaction) { setPayTx(t); setPayAmount(t.value); setPayDate(new Date().toISOString().split('T')[0]); setShowPayModal(true) }
  async function handleConfirmPay() {
    if (!payTx) return
    const newType = payTx.type === 'arec' ? 'entrada' : 'saida'
    await fetch(`/api/transactions/${payTx.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...payTx, type: newType, value: payAmount, transaction_date: payDate }) })
    await load()
    toast.show(payTx.type === 'arec' ? 'Marcado como recebido!' : 'Marcado como pago!', 'success')
    setShowPayModal(false); setPayTx(null)
  }

  function handleExportPDF() {
    window.print()
    toast.show('Gerando impressão/PDF...', 'info')
  }

  function handleExportCSV() {
    const rows = [
      ['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor'],
      ...filtered.map(t => [
        t.transaction_date || '',
        t.type === 'entrada' ? 'Entrada' : t.type === 'saida' ? 'Saída' : t.type === 'arec' ? 'A Receber' : 'A Pagar',
        (t.description || '').replace(/,/g, ';'),
        (t.category || '').replace(/,/g, ';'),
        String(t.value).replace('.', ','),
      ])
    ]
    const csv = rows.map(r => r.join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `financeiro-${MONTHS_FULL[selMonth]}-${selYear}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.show('CSV exportado!', 'success')
  }

  const years = [selYear - 1, selYear, selYear + 1]

  if (loading) return (
    <div style={{ color: '#555', padding: '40px', textAlign: 'center', background: '#0d0f12', minHeight: '100vh' }}>
      <div style={{ width: '32px', height: '32px', border: '2px solid #2a2d35', borderTopColor: '#e8c547', borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 12px' }} />
      Carregando...
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  // ─── Card style ───────────────────────────────────────────────────────────
  const card: React.CSSProperties = { background: '#111318', border: '1px solid rgba(255,255,255,.07)', borderRadius: '14px', overflow: 'hidden' }

  // ─── Tab filter helpers ───────────────────────────────────────────────────
  const allArecTxs = transactions.filter(t => t.type === 'arec')
  const allApagSaidaTxs = transactions.filter(t => t.type === 'apag' || t.type === 'saida')

  const filteredArecTab = allArecTxs.filter(t => {
    const matchSearch = !searchArec || (t.description || '').toLowerCase().includes(searchArec.toLowerCase())
    const matchStart  = !arecDateStart || (t.transaction_date || '') >= arecDateStart
    const matchEnd    = !arecDateEnd   || (t.transaction_date || '') <= arecDateEnd
    return matchSearch && matchStart && matchEnd
  })
  const arecTabTotal   = filteredArecTab.reduce((s, t) => s + Number(t.value), 0)
  const arecTabPending = filteredArecTab.reduce((s, t) => s + Number(t.value), 0)

  const filteredApagTab = allApagSaidaTxs.filter(t => {
    const matchSearch = !searchApag || (t.description || '').toLowerCase().includes(searchApag.toLowerCase()) || (t.category || '').toLowerCase().includes(searchApag.toLowerCase())
    const matchStart  = !apagDateStart || (t.transaction_date || '') >= apagDateStart
    const matchEnd    = !apagDateEnd   || (t.transaction_date || '') <= apagDateEnd
    return matchSearch && matchStart && matchEnd
  })
  const apagTabTotal   = filteredApagTab.reduce((s, t) => s + Number(t.value), 0)
  const apagTabPaid    = filteredApagTab.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
  const apagTabPending = filteredApagTab.filter(t => t.type === 'apag').reduce((s, t) => s + Number(t.value), 0)

  // ─── Summary card totals ──────────────────────────────────────────────────
  const arecRecebido  = filtered.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.value), 0)
  const arecPendente  = filtered.filter(t => t.type === 'arec').reduce((s, t) => s + Number(t.value), 0)
  const apagPago      = filtered.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
  const apagPendente  = filtered.filter(t => t.type === 'apag').reduce((s, t) => s + Number(t.value), 0)
  const resultEntradas = arecRecebido + arecPendente
  const resultSaidas   = apagPago + apagPendente
  const lucroLiquido   = resultEntradas - resultSaidas

  // ─── Visão Geral: filtered transactions table ─────────────────────────────
  const geralFiltered = filtered.filter(t => {
    const matchType  = !filterType || t.type === filterType
    const matchCat   = !filterCat  || (t.category || '') === filterCat
    const matchStart = !filterDateStart || (t.transaction_date || '') >= filterDateStart
    const matchEnd   = !filterDateEnd   || (t.transaction_date || '') <= filterDateEnd
    return matchType && matchCat && matchStart && matchEnd
  })

  const allCategories = [...new Set(filtered.map(t => t.category).filter(Boolean))] as string[]

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .tx-row:hover { background: rgba(255,255,255,.03) !important; }
        .tx-row:hover .tx-actions { opacity: 1 !important; }
        .tx-actions { opacity: 0; transition: opacity .15s; }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; color: black !important; }
        }
      `}</style>

      {/* ── 1. HEADER ─────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Financeiro</h1>
          <p style={{ color: '#555555', fontSize: '13px', marginBottom: '14px' }}>Controle suas receitas, despesas e contas</p>
          <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => openCreate('entrada')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,184,122,.15)', color: '#5db87a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ↑ Venda Rápida
            </button>
            <button
              onClick={() => openCreate('saida')}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.15)', color: '#e85d4a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ↓ Lançar Despesa
            </button>
            <button
              onClick={() => setShowCategoriesModal(true)}
              style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: '1px solid #2a2d35', background: 'transparent', color: '#888', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              ⚙ Categorias
            </button>
          </div>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
          <button onClick={handleExportCSV} style={{ ...btn('ghost'), fontSize: '12px', padding: '7px 12px' }}>📊 CSV</button>
          <button onClick={handleExportPDF} style={{ ...btn('ghost'), fontSize: '12px', padding: '7px 12px' }}>⬇ PDF</button>
          {perms.create !== false && <button onClick={() => openCreate()} style={btn('primary')}>+ Nova Transação</button>}
        </div>
      </div>

      {/* ── 2. SELETOR DE PERÍODO ─────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select style={{ ...inp, width: 'auto', minWidth: '80px' }} value={selYear} onChange={e => setSelYear(Number(e.target.value))}>
          {years.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {MONTHS.map((m, i) => (
            <button key={i} onClick={() => setSelMonth(i)} style={{ padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: selMonth === i ? 'rgba(232,197,71,.15)' : '#1a1d24', color: selMonth === i ? '#e8c547' : '#4b5563', transition: 'all .12s' }}>
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. BANNER ALERTA ──────────────────────────────────────────── */}
      {overdueItems.length > 0 && (
        <div style={{ background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '10px', padding: '12px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <div style={{ flex: 1, fontSize: '13px', color: '#e85d4a' }}>
            <strong>{overdueItems.length} fatura{overdueItems.length > 1 ? 's' : ''} em atraso</strong> totalizando <strong>{fv(overdueTotal)}</strong>
            {overdueArec.length > 0 && <span style={{ color: '#c0574a' }}> · clientes: {overdueArec.map(t => t.description?.split(' ').slice(0, 2).join(' ')).filter(Boolean).join(', ')}</span>}
          </div>
        </div>
      )}

      {/* ── TAB BAR ───────────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #2a2a2a', marginBottom: '24px', display: 'flex', gap: '0' }}>
        {([
          { key: 'geral',   label: 'Visão Geral' },
          { key: 'receber', label: 'Receber' },
          { key: 'pagar',   label: 'Pagar' },
          { key: 'contratos', label: '🔁 Contratos Fixos' },
          { key: 'despesas_fixas', label: '💸 Despesas Fixas' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #e8c547' : '2px solid transparent',
              color: activeTab === tab.key ? '#e8c547' : '#555',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 600 : 500,
              padding: '10px 20px',
              cursor: 'pointer',
              fontFamily: "'Montserrat', sans-serif",
              marginBottom: '-1px',
              transition: 'color .15s',
            }}
          >
            {tab.label}
            {tab.key === 'contratos' && contracts.filter(c => c.status === 'ativo').length > 0 && (
              <span style={{ marginLeft: '6px', background: '#5b9bd5', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>
                {contracts.filter(c => c.status === 'ativo').length}
              </span>
            )}
            {tab.key === 'despesas_fixas' && recurringExpenses.filter(e => e.status === 'ativo').length > 0 && (
              <span style={{ marginLeft: '6px', background: '#e85d4a', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px' }}>
                {recurringExpenses.filter(e => e.status === 'ativo').length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: VISÃO GERAL                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'geral' && (
        <>
          {/* ── EMPTY STATE ─────────────────────────────────────────── */}
          {filtered.length === 0 && (
            <div style={{ marginBottom: '24px' }}>
              <EmptyState
                icon="$"
                title={`Sem movimentações em ${MONTHS_FULL[selMonth]}`}
                subtitle="Registre entradas e saídas para acompanhar seu financeiro."
                action="+ Nova Transação"
                onAction={() => openCreate()}
              />
            </div>
          )}

          {/* ── SUMMARY CARDS ROW ───────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>

            {/* Contas a Receber */}
            <div style={{ background: '#111318', border: '1px solid #2a2a2a', borderLeft: '3px solid #5db87a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>📥</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Contas a Receber</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Recebido</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#5db87a', fontFamily: "'Montserrat', sans-serif" }}>{fv(arecRecebido)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Pendente</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8c547', fontFamily: "'Montserrat', sans-serif" }}>{fv(arecPendente)}</span>
              </div>
              <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0ece4' }}>Total</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ece4', fontFamily: "'Montserrat', sans-serif" }}>{fv(arecRecebido + arecPendente)}</span>
              </div>
            </div>

            {/* Contas a Pagar */}
            <div style={{ background: '#111318', border: '1px solid #2a2a2a', borderLeft: '3px solid #e85d4a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>📤</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Contas a Pagar</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Pago</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#5db87a', fontFamily: "'Montserrat', sans-serif" }}>{fv(apagPago)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Pendente</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#e8c547', fontFamily: "'Montserrat', sans-serif" }}>{fv(apagPendente)}</span>
              </div>
              <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0ece4' }}>Total</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ece4', fontFamily: "'Montserrat', sans-serif" }}>{fv(apagPago + apagPendente)}</span>
              </div>
            </div>

            {/* Resultado */}
            <div style={{ background: '#111318', border: '1px solid #2a2a2a', borderLeft: '3px solid #e8c547', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>📊</span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '1px' }}>Resultado</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Entradas</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#5db87a', fontFamily: "'Montserrat', sans-serif" }}>{fv(resultEntradas)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '13px', color: '#888' }}>Saídas</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#e85d4a', fontFamily: "'Montserrat', sans-serif" }}>{fv(resultSaidas)}</span>
              </div>
              <div style={{ borderTop: '1px solid #2a2a2a', paddingTop: '10px', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', fontWeight: 700, color: '#f0ece4' }}>Lucro Líquido</span>
                <span style={{ fontSize: '14px', fontWeight: 700, color: lucroLiquido >= 0 ? '#5db87a' : '#e85d4a', fontFamily: "'Montserrat', sans-serif" }}>{fv(lucroLiquido)}</span>
              </div>
            </div>
          </div>

          {/* ── KPIs GRID ───────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Receita Total', value: receitaTotal, color: '#5db87a', dt: deltaReceita },
              { label: 'Recebido', value: recebido, color: '#5db87a', dt: deltaRecebido },
              { label: 'A Receber', value: aReceber, color: '#5b9bd5', sub: `${arecItems.length} fatura${arecItems.length !== 1 ? 's' : ''} em aberto`, dt: null },
              { label: 'Despesas', value: despesaTotal, color: '#e85d4a', dt: deltaDespesas },
              { label: 'Saldo do Mês', value: saldoMes, color: saldoMes >= 0 ? '#5db87a' : '#e85d4a', dt: null },
              { label: 'Margem Líquida', value: null, color: margemPct >= 30 ? '#5db87a' : margemPct >= 10 ? '#e8c547' : '#e85d4a', pctVal: margemPct, dt: null },
            ].map(k => (
              <div key={k.label} style={{ ...card, padding: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '20px', color: k.color, lineHeight: 1.2 }}>
                  {k.pctVal !== undefined ? pct(k.pctVal) : fv(k.value!)}
                </div>
                {k.sub && <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>{k.sub}</div>}
                {k.dt && (
                  <div style={{ fontSize: '10px', color: k.dt.positive ? '#5db87a' : '#e85d4a', marginTop: '4px', fontWeight: 600 }}>
                    {k.dt.label}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── LUCRO BRUTO ─────────────────────────────────────────── */}
          <div style={{ ...card, padding: '20px 24px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>Lucro Bruto — {MONTHS_FULL[selMonth]} {selYear}</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: '32px', color: lucro >= 0 ? '#5db87a' : '#e85d4a', lineHeight: 1.1 }}>{fv(lucro)}</div>
              <div style={{ fontSize: '12px', color: '#4b5563', marginTop: '6px' }}>
                Receita {fv(receitaTotal)} &minus; Despesas {fv(despesaTotal)}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
              {[
                { label: 'Margem', value: pct(margemPct) },
                { label: 'Contratos', value: `${nContratos} fixo${nContratos !== 1 ? 's' : ''}` },
                { label: 'Projetos', value: projects.length.toString() },
                { label: 'Total Recebido', value: fvK(recebido) },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{s.value}</div>
                  <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginTop: '2px' }}>{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── GRÁFICOS ROW 1 ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <SLabel>Receita × Despesa — {selYear}</SLabel>
                <div style={{ fontSize: '11px', color: '#4b5563', textAlign: 'right' }}>
                  <div style={{ color: '#f0ece4', fontFamily: "'Montserrat', sans-serif", fontWeight: 700 }}>YTD: {fvK(ytdReceita - ytdDespesas)}</div>
                  <div>{MONTHS[selMonth]}</div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <ComposedChart data={yearData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2229" />
                  <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fvK(v)} tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#888' }} />
                  <Bar dataKey="Receita" fill="#5db87a" radius={[3,3,0,0]} maxBarSize={22} />
                  <Bar dataKey="Despesas" fill="#e85d4a" radius={[3,3,0,0]} maxBarSize={22} />
                  <Line dataKey="Lucro" stroke="#5b9bd5" strokeWidth={2} dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '4px' }}>
                <SLabel>Despesas por Categoria</SLabel>
                <div style={{ fontSize: '11px', color: '#4b5563' }}>{fvK(donutTotal)}</div>
              </div>
              {donutData.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '12px', padding: '40px 0' }}>Sem despesas</div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value">
                        {donutData.map((_, i) => <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />)}
                      </Pie>
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      <Tooltip formatter={(v: any) => fv(Number(v ?? 0))} contentStyle={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' }}>
                    {donutData.slice(0, 5).map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                        <span style={{ flex: 1, color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</span>
                        <span style={{ color: '#f0ece4', fontWeight: 600 }}>{pct((d.value / donutTotal) * 100)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ── GRÁFICOS ROW 2 ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ ...card, padding: '20px' }}>
              <SLabel>Fluxo de Caixa — Próximos 6 Meses</SLabel>
              <ResponsiveContainer width="100%" height={180}>
                <ComposedChart data={futureData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1f2229" />
                  <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <YAxis tickFormatter={v => fvK(v)} tick={{ fontSize: 10, fill: '#4b5563' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '11px', color: '#888' }} />
                  {futureData.map((d, i) => (
                    <Cell key={i} opacity={d.isFuture ? 0.35 : 1} />
                  ))}
                  <Bar dataKey="Entradas" fill="#5db87a" radius={[3,3,0,0]} maxBarSize={24} />
                  <Bar dataKey="Despesas" fill="#e85d4a" radius={[3,3,0,0]} maxBarSize={24} />
                </ComposedChart>
              </ResponsiveContainer>
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '8px' }}>
                Entradas = contratos fixos ativos · Despesas = média 3 meses
              </div>
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <SLabel>Receita por Cliente</SLabel>
              {topClientes.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '12px', padding: '40px 0' }}>Sem dados</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {topClientes.map(([name, val], i) => (
                    <div key={name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                        <span style={{ fontSize: '12px', color: '#c0bdb5' }}>#{i + 1} {name}</span>
                        <span style={{ fontSize: '12px', fontWeight: 700, color: '#5db87a', fontFamily: "'Montserrat', sans-serif" }}>{fvK(val)}</span>
                      </div>
                      <div style={{ background: '#1a1d24', borderRadius: '4px', height: '4px' }}>
                        <div style={{ background: '#5db87a', height: '100%', borderRadius: '4px', width: `${(val / maxCliente) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── CONTRATOS FIXOS ─────────────────────────────────────── */}
          {contracts.filter(c => c.status === 'ativo').length > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <SLabel>Contratos Fixos — Receita Recorrente</SLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
                {contracts.filter(c => c.status === 'ativo').map(c => {
                  const gerado = (c.generated_months || []).includes(currentMonthKey)
                  return (
                    <div key={c.id} style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 600, color: '#f0ece4', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      {c.clients?.name && <div style={{ fontSize: '11px', color: '#4b5563', marginBottom: '8px' }}>👤 {c.clients.name}</div>}
                      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#5db87a', marginBottom: '10px' }}>{fv(c.value)}<span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 400 }}>/mês</span></div>
                      {gerado
                        ? <span style={{ fontSize: '11px', fontWeight: 600, color: '#5db87a' }}>✓ Gerado este mês</span>
                        : (
                          <button onClick={() => generateCharge(c)} style={{ padding: '5px 12px', background: 'rgba(93,184,122,.12)', border: '1px solid rgba(93,184,122,.25)', borderRadius: '6px', color: '#5db87a', fontSize: '11px', fontWeight: 600, cursor: 'pointer', width: '100%' }}>
                            ⚡ Gerar cobrança
                          </button>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {clientesFixos.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <SLabel>Contratos Fixos</SLabel>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '15px', color: '#5db87a' }}>{fv(receitaFixaMensal)}<span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 400 }}>/mês</span></span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px' }}>
                {clientesFixos.map(c => {
                  const isOverdue = overdueArec.some(t => t.description?.toLowerCase().includes(c.name.toLowerCase()))
                  return (
                    <div key={c.id} style={{ ...card, padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, fontSize: '13px', color: '#f0ece4', marginBottom: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</div>
                      <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '18px', color: '#5db87a' }}>{fv(Number(c.monthly_value))}<span style={{ fontSize: '10px', color: '#4b5563', fontWeight: 400 }}>/mês</span></div>
                      <div style={{ marginTop: '8px' }}>
                        {isOverdue
                          ? <span style={{ background: 'rgba(232,93,74,.12)', color: '#e85d4a', border: '1px solid rgba(232,93,74,.25)', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 7px' }}>⚠ Fatura atrasada</span>
                          : <span style={{ background: 'rgba(93,184,122,.1)', color: '#5db87a', border: '1px solid rgba(93,184,122,.2)', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '2px 7px' }}>✓ Ativo</span>
                        }
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── CONTAS A RECEBER / A PAGAR ──────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ ...card }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '14px', color: '#5b9bd5' }}>📥 Contas a Receber</span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '14px', color: '#5b9bd5' }}>{fv(aReceber)}</span>
              </div>
              {arecItems.length > 0 && (
                <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { label: 'Em dia', b: agingArec.ok, color: '#5db87a' },
                    { label: '1–15 dias', b: agingArec.d15, color: '#e8c547' },
                    { label: '+30 dias', b: agingArec.d30, color: '#e85d4a' },
                  ].map(({ label, b, color }) => b.count > 0 && (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <span style={{ width: '60px', color: '#4b5563' }}>{label}</span>
                      <div style={{ flex: 1, background: '#1a1d24', borderRadius: '4px', height: '4px' }}>
                        <div style={{ background: color, height: '100%', borderRadius: '4px', width: `${(b.total / (aReceber || 1)) * 100}%` }} />
                      </div>
                      <span style={{ color, fontWeight: 600 }}>{b.count}</span>
                      <span style={{ color: '#4b5563', minWidth: '60px', textAlign: 'right' }}>{fvK(b.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: '6px 0' }}>
                {arecItems.length === 0
                  ? <div style={{ padding: '16px', fontSize: '12px', color: '#4b5563', textAlign: 'center' }}>Nenhuma conta a receber</div>
                  : arecItems.map(t => <TxRow key={t.id} t={t} sign="+" color="#5b9bd5" onPay={perms.edit !== false ? openPayModal : undefined} onEdit={perms.edit !== false ? openEdit : undefined} onDelete={perms.delete !== false ? handleDelete : undefined} payLabel="✓ Recebido" />)
                }
              </div>
              <div style={{ padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>✓ Entradas recebidas</span>
              </div>
              <div style={{ padding: '4px 0' }}>
                {entradaItems.length === 0
                  ? <div style={{ padding: '10px 18px', fontSize: '12px', color: '#4b5563' }}>Nenhuma entrada</div>
                  : entradaItems.map(t => <TxRow key={t.id} t={t} sign="+" color="#5db87a" onEdit={perms.edit !== false ? openEdit : undefined} onDelete={perms.delete !== false ? handleDelete : undefined} compact />)
                }
              </div>
              <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#4b5563' }}>Total entradas</span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#5db87a' }}>{fv(recebido)}</span>
              </div>
            </div>

            <div style={{ ...card }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8924a' }}>📤 Contas a Pagar</span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8924a' }}>{fv(aPagar)}</span>
              </div>
              {apagItems.length > 0 && (
                <div style={{ padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.04)', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {[
                    { label: 'Em dia', b: agingApag.ok, color: '#5db87a' },
                    { label: '1–15 dias', b: agingApag.d15, color: '#e8c547' },
                    { label: '+30 dias', b: agingApag.d30, color: '#e85d4a' },
                  ].map(({ label, b, color }) => b.count > 0 && (
                    <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px' }}>
                      <span style={{ width: '60px', color: '#4b5563' }}>{label}</span>
                      <div style={{ flex: 1, background: '#1a1d24', borderRadius: '4px', height: '4px' }}>
                        <div style={{ background: color, height: '100%', borderRadius: '4px', width: `${(b.total / (aPagar || 1)) * 100}%` }} />
                      </div>
                      <span style={{ color, fontWeight: 600 }}>{b.count}</span>
                      <span style={{ color: '#4b5563', minWidth: '60px', textAlign: 'right' }}>{fvK(b.total)}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ padding: '6px 0' }}>
                {apagItems.length === 0
                  ? <div style={{ padding: '16px', fontSize: '12px', color: '#4b5563', textAlign: 'center' }}>Nenhuma conta a pagar</div>
                  : apagItems.map(t => <TxRow key={t.id} t={t} sign="-" color="#e8924a" onPay={perms.edit !== false ? openPayModal : undefined} onEdit={perms.edit !== false ? openEdit : undefined} onDelete={perms.delete !== false ? handleDelete : undefined} payLabel="✓ Pago" />)
                }
              </div>
              <div style={{ padding: '8px 18px', borderTop: '1px solid rgba(255,255,255,.04)', borderBottom: '1px solid rgba(255,255,255,.06)' }}>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>✓ Despesas pagas</span>
              </div>
              <div style={{ padding: '4px 0' }}>
                {saidaItems.length === 0
                  ? <div style={{ padding: '10px 18px', fontSize: '12px', color: '#4b5563' }}>Nenhuma despesa</div>
                  : saidaItems.map(t => <TxRow key={t.id} t={t} sign="-" color="#e85d4a" onEdit={perms.edit !== false ? openEdit : undefined} onDelete={perms.delete !== false ? handleDelete : undefined} compact />)
                }
              </div>
              <div style={{ padding: '10px 18px', borderTop: '1px solid rgba(255,255,255,.04)', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: '#4b5563' }}>Total despesas</span>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#e85d4a' }}>{fv(despesas)}</span>
              </div>
            </div>
          </div>

          {/* ── SEÇÃO INFERIOR 3 COLUNAS ────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '24px' }}>
            <div style={{ ...card, padding: '20px' }}>
              <SLabel>Margem por Projeto</SLabel>
              {margemPorProjeto.length === 0
                ? <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '12px', padding: '30px 0' }}>Sem projetos com dados</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {margemPorProjeto.map(p => (
                      <div key={p.name}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                          <span style={{ fontSize: '11px', color: '#c0bdb5', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>{p.name}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: p.margem >= 40 ? '#5db87a' : p.margem >= 20 ? '#e8c547' : '#e85d4a' }}>{pct(p.margem)}</span>
                        </div>
                        <div style={{ background: '#1a1d24', borderRadius: '4px', height: '5px' }}>
                          <div style={{ background: p.margem >= 40 ? '#5db87a' : p.margem >= 20 ? '#e8c547' : '#e85d4a', height: '100%', borderRadius: '4px', width: `${p.margem}%`, transition: 'width .4s' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )
              }
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <SLabel>Métricas Operacionais</SLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '16px' }}>
                {[
                  { label: `Contratos Ativos (${nContratos})`, pct: nContratos > 0 ? 100 : 0, color: '#5b9bd5' },
                  { label: 'Receita Recebida', pct: recPct, color: '#5db87a' },
                  { label: 'Despesas Pagas', pct: despPct, color: '#e85d4a' },
                ].map(m => (
                  <div key={m.label}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '11px', color: '#888' }}>{m.label}</span>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: m.color }}>{pct(m.pct)}</span>
                    </div>
                    <div style={{ background: '#1a1d24', borderRadius: '4px', height: '5px' }}>
                      <div style={{ background: m.color, height: '100%', borderRadius: '4px', width: `${Math.min(m.pct, 100)}%`, transition: 'width .4s' }} />
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid rgba(255,255,255,.06)', paddingTop: '12px' }}>
                {[
                  { label: 'Ticket Médio/Contrato', value: fv(ticketMedio) },
                  { label: 'Custo Médio/Projeto', value: fv(avgProjCost) },
                  { label: 'Margem Média', value: pct(margemPct) },
                ].map(m => (
                  <div key={m.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '11px', color: '#4b5563' }}>{m.label}</span>
                    <span style={{ fontSize: '12px', fontWeight: 600, color: '#f0ece4' }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ ...card, padding: '20px' }}>
              <SLabel>Insights do Mês</SLabel>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {insights.slice(0, 4).map((ins, i) => (
                  <div key={i} style={{ background: `${ins.color}0f`, border: `1px solid ${ins.color}30`, borderRadius: '8px', padding: '10px 12px', display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontSize: '14px', flexShrink: 0 }}>{ins.icon}</span>
                    <span style={{ fontSize: '11px', color: ins.color, lineHeight: 1.4 }}>{ins.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── TRANSAÇÕES (com filtros) ─────────────────────────────── */}
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '15px', fontWeight: 700, color: '#f0ece4' }}>Transações</h2>
            </div>

            {/* Info box */}
            <div style={{ background: 'rgba(91,155,213,.07)', border: '1px solid rgba(91,155,213,.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: '#5b9bd5' }}>
              <span>ℹ</span>
              <span>As transações são geradas automaticamente. Para criar manualmente use os botões acima.</span>
            </div>

            {/* Filter row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <select style={{ ...inp, width: 'auto', minWidth: '130px' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">Todos os tipos</option>
                <option value="entrada">Entrada</option>
                <option value="saida">Despesa</option>
                <option value="arec">A Receber</option>
                <option value="apag">A Pagar</option>
              </select>
              <select style={{ ...inp, width: 'auto', minWidth: '130px' }} value={filterCat} onChange={e => setFilterCat(e.target.value)}>
                <option value="">Todas categorias</option>
                {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <input type="date" style={{ ...inp, width: 'auto' }} value={filterDateStart} onChange={e => setFilterDateStart(e.target.value)} title="Data início" />
              <input type="date" style={{ ...inp, width: 'auto' }} value={filterDateEnd} onChange={e => setFilterDateEnd(e.target.value)} title="Data fim" />
              {(filterType || filterCat || filterDateStart || filterDateEnd) && (
                <button onClick={() => { setFilterType(''); setFilterCat(''); setFilterDateStart(''); setFilterDateEnd('') }} style={{ ...btn('ghost'), fontSize: '11px', padding: '6px 10px' }}>✕ Limpar</button>
              )}
            </div>

            <button
              onClick={() => setShowHistorico(v => !v)}
              style={{ ...btn('ghost'), width: '100%', justifyContent: 'space-between', padding: '10px 16px' }}
            >
              <span>Ver transações ({geralFiltered.length})</span>
              <span style={{ fontSize: '11px', color: '#4b5563' }}>{showHistorico ? '▲' : '▼'}</span>
            </button>
            {showHistorico && (
              <div style={{ ...card, borderTop: 'none', borderRadius: '0 0 14px 14px' }}>
                {geralFiltered.length === 0
                  ? <div style={{ padding: '24px', textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>Nenhuma transação neste período</div>
                  : geralFiltered.map((t, i) => {
                    const colors: Record<string, string> = { entrada: '#5db87a', saida: '#e85d4a', arec: '#5b9bd5', apag: '#e8924a' }
                    const labels: Record<string, string> = { entrada: 'Entrada', saida: 'Despesa', arec: 'A Receber', apag: 'A Pagar' }
                    const isOut = t.type === 'saida' || t.type === 'apag'
                    return (
                      <div key={t.id} className="tx-row" style={{ display: 'flex', alignItems: 'center', padding: '10px 18px', borderBottom: i < geralFiltered.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', gap: '10px', cursor: 'default' }}>
                        <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: colors[t.type] || '#555', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '12px', color: '#f0ece4', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
                          <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '1px' }}>
                            <span style={{ color: colors[t.type] }}>{labels[t.type]}</span>
                            {t.category ? ` · ${t.category}` : ''}
                            {t.transaction_date ? ` · ${fd(t.transaction_date)}` : ''}
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: colors[t.type], flexShrink: 0 }}>
                          {isOut ? '-' : '+'}{fv(t.value)}
                        </div>
                        <div className="tx-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
                          <button onClick={() => openEdit(t)} style={{ ...btn('ghost'), padding: '3px 8px', fontSize: '11px' }}>✏️</button>
                          <button onClick={() => handleDelete(t.id)} style={{ ...btn('danger'), padding: '3px 8px', fontSize: '11px' }}>🗑</button>
                        </div>
                      </div>
                    )
                  })
                }
              </div>
            )}
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: RECEBER                                                   */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'receber' && (
        <div>
          {/* Contratos Fixos — Receber */}
          {contracts.filter(c => c.status === 'ativo').length > 0 && (
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '2px' }}>🔁 Contratos Fixos</div>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#5db87a' }}>
                  {fv(contracts.filter(c=>c.status==='ativo').reduce((s,c)=>s+c.value,0))}/mês
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {contracts.filter(c => c.status === 'ativo').map(c => {
                  const gerado = (c.generated_months || []).includes(currentMonthKey)
                  return (
                    <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0d0f12', borderRadius: '8px', border: '1px solid #1f2229' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: gerado ? '#5db87a' : '#e8c547', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: '#f0ece4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{c.name}</div>
                        {c.clients?.name && <div style={{ fontSize: '11px', color: '#4b5563' }}>👤 {c.clients.name} · Vence dia {c.due_day}</div>}
                      </div>
                      <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#5db87a', flexShrink: 0 }}>{fv(c.value)}</span>
                      {gerado
                        ? <span style={{ fontSize: '11px', color: '#5db87a', fontWeight: 600, flexShrink: 0 }}>✓ Gerado</span>
                        : <button onClick={() => generateCharge(c)} style={{ padding: '5px 14px', background: 'rgba(232,197,71,.12)', border: '1px solid rgba(232,197,71,.25)', borderRadius: '6px', color: '#e8c547', fontSize: '11px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>⚡ Gerar</button>
                      }
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" style={{ ...inp, width: 'auto' }} value={arecDateStart} onChange={e => setArecDateStart(e.target.value)} title="Data início" />
            <input type="date" style={{ ...inp, width: 'auto' }} value={arecDateEnd} onChange={e => setArecDateEnd(e.target.value)} title="Data fim" />
            <span style={{ background: 'rgba(93,184,122,.12)', color: '#5db87a', border: '1px solid rgba(93,184,122,.25)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, padding: '4px 12px' }}>
              Total: {fv(arecTabTotal)}
            </span>
            <span style={{ background: 'rgba(232,197,71,.1)', color: '#e8c547', border: '1px solid rgba(232,197,71,.25)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, padding: '4px 12px' }}>
              Pendente: {fv(arecTabPending)}
            </span>
            <div style={{ flex: 1 }} />
            {perms.create !== false && (
              <button onClick={() => openCreate('arec')} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,184,122,.15)', color: '#5db87a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                + Nova Conta a Receber
              </button>
            )}
          </div>

          {/* Section heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>💰</span>
            <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '15px', fontWeight: 700, color: '#f0ece4' }}>Contas a Receber</h2>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '14px' }}>
            <input
              style={inp}
              value={searchArec}
              onChange={e => setSearchArec(e.target.value)}
              placeholder="Buscar descrição, cliente..."
            />
          </div>

          {/* Table */}
          <div style={{ ...card }}>
            {/* Header */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 100px 100px', gap: '8px', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span>Descrição</span>
              <span style={{ textAlign: 'right' }}>Valor</span>
              <span>Data</span>
              <span>Status</span>
              <span>Ações</span>
            </div>
            {filteredArecTab.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>Nenhuma conta a receber encontrada</div>
            ) : (
              filteredArecTab.map((t, i) => {
                const isPending = t.type === 'arec'
                const isOverdue = t.transaction_date && t.transaction_date < today
                return (
                  <div key={t.id} className="tx-row" style={{ display: 'grid', gridTemplateColumns: '1fr 120px 110px 100px 100px', gap: '8px', alignItems: 'center', padding: '11px 18px', borderBottom: i < filteredArecTab.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', cursor: 'default' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
                      {t.category && <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '1px' }}>{t.category}</div>}
                    </div>
                    <div style={{ textAlign: 'right', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#5db87a' }}>+{fv(t.value)}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {t.transaction_date ? fd(t.transaction_date) : '—'}
                      {isOverdue && isPending && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#e85d4a' }}>⚠</span>}
                    </div>
                    <div>
                      {isPending
                        ? <span style={{ background: 'rgba(232,197,71,.12)', color: '#e8c547', border: '1px solid rgba(232,197,71,.25)', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '2px 8px' }}>Pendente</span>
                        : <span style={{ background: 'rgba(93,184,122,.12)', color: '#5db87a', border: '1px solid rgba(93,184,122,.25)', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '2px 8px' }}>Recebido</span>
                      }
                    </div>
                    <div className="tx-actions" style={{ display: 'flex', gap: '4px' }}>
                      {isPending && perms.edit !== false && (
                        <button onClick={() => openPayModal(t)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,184,122,.12)', color: '#5db87a' }}>✓</button>
                      )}
                      {perms.edit !== false && <button onClick={() => openEdit(t)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #2a2d35', background: 'transparent', color: '#6b7280' }}>✏️</button>}
                      {perms.delete !== false && <button onClick={() => handleDelete(t.id)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.1)', color: '#e85d4a' }}>🗑</button>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: PAGAR                                                     */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'pagar' && (
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
            <input type="date" style={{ ...inp, width: 'auto' }} value={apagDateStart} onChange={e => setApagDateStart(e.target.value)} title="Data início" />
            <input type="date" style={{ ...inp, width: 'auto' }} value={apagDateEnd} onChange={e => setApagDateEnd(e.target.value)} title="Data fim" />
            <span style={{ background: 'rgba(232,93,74,.1)', color: '#e85d4a', border: '1px solid rgba(232,93,74,.25)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, padding: '4px 12px' }}>
              Total: {fv(apagTabTotal)}
            </span>
            <span style={{ background: 'rgba(93,184,122,.12)', color: '#5db87a', border: '1px solid rgba(93,184,122,.25)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, padding: '4px 12px' }}>
              Pago: {fv(apagTabPaid)}
            </span>
            <span style={{ background: 'rgba(232,197,71,.1)', color: '#e8c547', border: '1px solid rgba(232,197,71,.25)', borderRadius: '20px', fontSize: '12px', fontWeight: 600, padding: '4px 12px' }}>
              Pendente: {fv(apagTabPending)}
            </span>
            <div style={{ flex: 1 }} />
            {perms.create !== false && (
              <button onClick={() => openCreate('saida')} style={{ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.15)', color: '#e85d4a', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                ↓ Lançar Despesa
              </button>
            )}
          </div>

          {/* Section heading */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '18px' }}>💳</span>
            <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '15px', fontWeight: 700, color: '#f0ece4' }}>Contas a Pagar</h2>
          </div>

          {/* Search */}
          <div style={{ marginBottom: '14px' }}>
            <input
              style={inp}
              value={searchApag}
              onChange={e => setSearchApag(e.target.value)}
              placeholder="Buscar fornecedor, descrição..."
            />
          </div>

          {/* Table */}
          <div style={{ ...card }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 110px 100px 100px', gap: '8px', padding: '10px 18px', borderBottom: '1px solid rgba(255,255,255,.06)', fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px' }}>
              <span>Descrição</span>
              <span>Categoria</span>
              <span style={{ textAlign: 'right' }}>Valor</span>
              <span>Data</span>
              <span>Status</span>
              <span>Ações</span>
            </div>
            {filteredApagTab.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#4b5563' }}>Nenhuma despesa encontrada</div>
            ) : (
              filteredApagTab.map((t, i) => {
                const isPending = t.type === 'apag'
                const isOverdue = t.transaction_date && t.transaction_date < today
                return (
                  <div key={t.id} className="tx-row" style={{ display: 'grid', gridTemplateColumns: '1fr 130px 120px 110px 100px 100px', gap: '8px', alignItems: 'center', padding: '11px 18px', borderBottom: i < filteredApagTab.length - 1 ? '1px solid rgba(255,255,255,.04)' : 'none', cursor: 'default' }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
                    </div>
                    <div style={{ fontSize: '12px', color: '#888', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.category || '—'}</div>
                    <div style={{ textAlign: 'right', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#e85d4a' }}>-{fv(t.value)}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>
                      {t.transaction_date ? fd(t.transaction_date) : '—'}
                      {isOverdue && isPending && <span style={{ marginLeft: '4px', fontSize: '10px', color: '#e85d4a' }}>⚠</span>}
                    </div>
                    <div>
                      {isPending
                        ? <span style={{ background: 'rgba(232,197,71,.12)', color: '#e8c547', border: '1px solid rgba(232,197,71,.25)', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '2px 8px' }}>Pendente</span>
                        : <span style={{ background: 'rgba(93,184,122,.12)', color: '#5db87a', border: '1px solid rgba(93,184,122,.25)', borderRadius: '20px', fontSize: '10px', fontWeight: 700, padding: '2px 8px' }}>Pago</span>
                      }
                    </div>
                    <div className="tx-actions" style={{ display: 'flex', gap: '4px' }}>
                      {isPending && perms.edit !== false && (
                        <button onClick={() => openPayModal(t)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,184,122,.12)', color: '#5db87a' }}>✓</button>
                      )}
                      {perms.edit !== false && <button onClick={() => openEdit(t)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #2a2d35', background: 'transparent', color: '#6b7280' }}>✏️</button>}
                      {perms.delete !== false && <button onClick={() => handleDelete(t.id)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.1)', color: '#e85d4a' }}>🗑</button>}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: CONTRATOS FIXOS                                          */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'contratos' && (
        <div>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#f0ece4' }}>Contratos Fixos</div>
            <button onClick={() => openContractForm()} style={btn('primary')}>+ Novo Contrato Fixo</button>
          </div>

          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'CONTRATOS ATIVOS', value: contracts.filter(c => c.status === 'ativo').length.toString(), color: '#5b9bd5' },
              { label: 'RECEITA MENSAL FIXA', value: fv(contracts.filter(c => c.status === 'ativo').reduce((s, c) => s + Number(c.value), 0)), color: '#5db87a' },
              { label: 'COBRANÇAS ESTE MÊS', value: contracts.filter(c => (c.generated_months || []).includes(currentMonthKey)).length.toString(), color: '#e8c547' },
            ].map(k => (
              <div key={k.label} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Contracts list */}
          {contracts.length === 0 ? (
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '48px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔁</div>
              <div style={{ color: '#f0ece4', fontWeight: 600, marginBottom: '6px' }}>Nenhum contrato fixo</div>
              <div style={{ color: '#4b5563', fontSize: '13px' }}>Marque um projeto como <strong>📅 Contrato recorrente mensal</strong> na tela de Projetos para ele aparecer aqui.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {contracts.map(c => {
                const alreadyGenerated = (c.generated_months || []).includes(currentMonthKey)
                const isActive = c.status === 'ativo'
                return (
                  <div key={c.id} style={{ background: '#111318', border: `1px solid ${isActive ? 'rgba(93,184,122,.2)' : '#1f2229'}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#5db87a' : '#555', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ece4' }}>{c.name}</span>
                        {c.projects?.name && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '20px', color: '#9ca3af' }}>
                            📁 {c.projects.name}
                          </span>
                        )}
                        {!isActive && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(107,114,128,.15)', border: '1px solid rgba(107,114,128,.3)', borderRadius: '20px', color: '#6b7280' }}>
                            {c.status === 'pausado' ? 'Pausado' : 'Cancelado'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' as const }}>
                        {c.clients?.name && <span>👤 {c.clients.name}</span>}
                        <span>📅 Vence dia {c.due_day}</span>
                        {alreadyGenerated && <span style={{ color: '#5db87a' }}>✓ Cobrança gerada este mês</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: 700, color: '#5db87a' }}>{fv(Number(c.value))}</div>
                      <div style={{ fontSize: '11px', color: '#4b5563' }}>/mês</div>
                    </div>
                    <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {isActive && !alreadyGenerated ? (
                        <button
                          onClick={() => generateCharge(c)}
                          style={{ padding: '8px 16px', background: 'rgba(93,184,122,.15)', border: '1px solid rgba(93,184,122,.3)', borderRadius: '8px', color: '#5db87a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          ⚡ Gerar cobrança
                        </button>
                      ) : isActive && alreadyGenerated ? (
                        <span style={{ fontSize: '12px', color: '#5db87a', padding: '8px 12px', background: 'rgba(93,184,122,.08)', borderRadius: '8px', border: '1px solid rgba(93,184,122,.15)' }}>✓ Gerado</span>
                      ) : (
                        <span style={{ fontSize: '12px', color: '#555' }}>—</span>
                      )}
                      <button onClick={() => openContractForm(c)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '6px', color: '#9ca3af', fontSize: '12px', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteContract(c.id)} style={{ padding: '6px 10px', background: 'transparent', border: '1px solid rgba(239,68,68,.2)', borderRadius: '6px', color: '#ef4444', fontSize: '12px', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* TAB: DESPESAS FIXAS                                           */}
      {/* ════════════════════════════════════════════════════════════════ */}
      {activeTab === 'despesas_fixas' && (
        <div>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px' }}>
            {[
              { label: 'DESPESAS ATIVAS', value: recurringExpenses.filter(e => e.status === 'ativo').length.toString(), color: '#e85d4a' },
              { label: 'CUSTO MENSAL FIXO', value: fv(despesaFixaMensal), color: '#e8924a' },
              { label: 'GERADAS ESTE MÊS', value: recurringExpenses.filter(e => (e.generated_months || []).includes(currentMonthKey)).length.toString(), color: '#e8c547' },
            ].map(k => (
              <div key={k.label} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px 20px' }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '8px' }}>{k.label}</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: 700, color: k.color }}>{k.value}</div>
              </div>
            ))}
          </div>

          {/* Header + Add button */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', color: '#4b5563' }}>
              {despesaFixaMensal > 0 && <span>Total mensal: <strong style={{ color: '#e8924a' }}>{fv(despesaFixaMensal)}</strong> em {recurringExpenses.filter(e => e.status === 'ativo').length} despesa{recurringExpenses.filter(e => e.status === 'ativo').length !== 1 ? 's' : ''}</span>}
            </div>
            <button
              onClick={() => openExpenseForm()}
              style={{ padding: '8px 16px', background: 'rgba(232,93,74,.15)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '8px', color: '#e85d4a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Montserrat', sans-serif" }}
            >
              + Nova Despesa Fixa
            </button>
          </div>

          {/* List */}
          {recurringExpenses.length === 0 ? (
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '48px', textAlign: 'center' as const }}>
              <div style={{ fontSize: '32px', marginBottom: '12px' }}>💸</div>
              <div style={{ color: '#f0ece4', fontWeight: 600, marginBottom: '6px' }}>Nenhuma despesa fixa</div>
              <div style={{ color: '#4b5563', fontSize: '13px' }}>Cadastre despesas recorrentes como aluguel, internet, salários etc.</div>
              <button onClick={() => openExpenseForm()} style={{ marginTop: '16px', padding: '8px 20px', background: 'rgba(232,93,74,.15)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '8px', color: '#e85d4a', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}>
                + Adicionar primeira despesa
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {recurringExpenses.map(exp => {
                const alreadyGenerated = (exp.generated_months || []).includes(currentMonthKey)
                const isActive = exp.status === 'ativo'
                return (
                  <div key={exp.id} style={{ background: '#111318', border: `1px solid ${isActive ? 'rgba(232,93,74,.2)' : '#1f2229'}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: isActive ? '#e85d4a' : '#555', flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' as const }}>
                        <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ece4' }}>{exp.name}</span>
                        {exp.category && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '20px', color: '#9ca3af' }}>{exp.category}</span>
                        )}
                        {!isActive && (
                          <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(107,114,128,.15)', border: '1px solid rgba(107,114,128,.3)', borderRadius: '20px', color: '#6b7280' }}>
                            {exp.status === 'pausado' ? 'Pausado' : 'Cancelado'}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' as const }}>
                        <span>📅 Vence dia {exp.due_day}</span>
                        {alreadyGenerated && <span style={{ color: '#5db87a' }}>✓ Lançada este mês</span>}
                        {exp.notes && <span>📝 {exp.notes}</span>}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: 700, color: '#e85d4a' }}>{fv(Number(exp.value))}</div>
                      <div style={{ fontSize: '11px', color: '#4b5563' }}>/mês</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexShrink: 0, flexWrap: 'wrap' as const }}>
                      {isActive && !alreadyGenerated ? (
                        <button
                          onClick={() => generateExpense(exp)}
                          style={{ padding: '7px 14px', background: 'rgba(232,93,74,.15)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '8px', color: '#e85d4a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: "'Montserrat', sans-serif" }}>
                          ⚡ Lançar
                        </button>
                      ) : isActive && alreadyGenerated ? (
                        <span style={{ fontSize: '12px', color: '#5db87a', padding: '7px 12px', background: 'rgba(93,184,122,.08)', borderRadius: '8px', border: '1px solid rgba(93,184,122,.15)' }}>✓ Lançado</span>
                      ) : null}
                      <button onClick={() => openExpenseForm(exp)} style={{ padding: '7px 10px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '8px', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}>✏️</button>
                      <button onClick={() => deleteExpense(exp.id)} style={{ padding: '7px 10px', background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.15)', borderRadius: '8px', color: '#e85d4a', fontSize: '12px', cursor: 'pointer' }}>🗑</button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Form modal */}
          {showExpenseForm && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
              <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
                <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '15px', color: '#f0ece4' }}>{editingExpense ? 'Editar Despesa Fixa' : '+ Nova Despesa Fixa'}</h3>
                  <button onClick={() => setShowExpenseForm(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
                </div>
                <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Nome *</label>
                    <input style={inp} value={expenseForm.name} onChange={e => setExpenseForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Aluguel do estúdio" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor (R$) *</label>
                      <input inputMode="decimal" style={inp} value={expenseForm.value || ''} onChange={e => setExpenseForm(f => ({ ...f, value: Number(e.target.value.replace(',', '.')) }))} placeholder="0" />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Dia do vencimento</label>
                      <input inputMode="numeric" style={inp} value={expenseForm.due_day} onChange={e => setExpenseForm(f => ({ ...f, due_day: Number(e.target.value) }))} />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Categoria</label>
                    {categories.length > 0
                      ? <select style={inp} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))}><option value="">— Selecionar —</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                      : <input style={inp} value={expenseForm.category} onChange={e => setExpenseForm(f => ({ ...f, category: e.target.value }))} placeholder="Aluguel, Internet, Salário..." />
                    }
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Observações</label>
                    <input style={inp} value={expenseForm.notes} onChange={e => setExpenseForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais..." />
                  </div>
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                    <button onClick={() => setShowExpenseForm(false)} style={btn('ghost')}>Cancelar</button>
                    <button onClick={saveExpense} style={btn('primary')}>{editingExpense ? 'Salvar' : 'Criar'}</button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── CONTRACT FORM MODAL ──────────────────────────────────────── */}
      {showContractForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={() => setShowContractForm(false)}>
          <div style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '480px' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#f0ece4', fontSize: '15px' }}>{editingContract ? 'Editar Contrato Fixo' : '+ Novo Contrato Fixo'}</div>
              <button onClick={() => setShowContractForm(false)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Nome *</label>
                <input style={inp} value={contractForm.name} onChange={e => setContractForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Retainer mensal - Cliente X" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor (R$) *</label>
                  <input inputMode="decimal" style={inp} value={contractForm.value || ''} onChange={e => setContractForm(f => ({ ...f, value: Number(e.target.value.replace(',', '.')) }))} placeholder="0" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Dia vencimento</label>
                  <input inputMode="numeric" style={inp} value={contractForm.due_day} onChange={e => setContractForm(f => ({ ...f, due_day: Number(e.target.value) }))} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Cliente</label>
                <select style={inp} value={contractForm.client_id} onChange={e => setContractForm(f => ({ ...f, client_id: e.target.value }))}>
                  <option value="">— Selecionar —</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Início</label>
                  <input type="date" style={inp} value={contractForm.start_date} onChange={e => setContractForm(f => ({ ...f, start_date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Status</label>
                  <select style={inp} value={contractForm.status} onChange={e => setContractForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="ativo">Ativo</option>
                    <option value="pausado">Pausado</option>
                    <option value="cancelado">Cancelado</option>
                  </select>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Observações</label>
                <input style={inp} value={contractForm.notes} onChange={e => setContractForm(f => ({ ...f, notes: e.target.value }))} placeholder="Informações adicionais..." />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                <button onClick={() => setShowContractForm(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={saveContract} style={btn('primary')}>{editingContract ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── CATEGORIES MODAL ──────────────────────────────────────────── */}
      {showCategoriesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '380px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '15px', color: '#f0ece4' }}>⚙ Categorias Financeiras</h3>
              <button onClick={() => setShowCategoriesModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {categories.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#4b5563', fontSize: '13px', padding: '20px 0' }}>
                  Nenhuma categoria configurada.<br />
                  <span style={{ fontSize: '12px' }}>Adicione categorias em Configurações da empresa.</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {categories.map(c => (
                    <div key={c} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: '#1a1d24', borderRadius: '8px' }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#e8c547', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: '#f0ece4' }}>{c}</span>
                    </div>
                  ))}
                </div>
              )}
              <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowCategoriesModal(false)} style={btn('ghost')}>Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PAY MODAL ─────────────────────────────────────────────────── */}
      {showPayModal && payTx && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '380px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '15px', color: '#f0ece4' }}>
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
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                  Valor {payTx.type === 'arec' ? 'Recebido' : 'Pago'} (R$)
                </label>
                <input type="number" autoFocus style={{ ...inp, fontSize: '18px', color: payTx.type === 'arec' ? '#5db87a' : '#e8924a', fontWeight: 700 }} value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} min={0} step={0.01} />
                {payAmount !== payTx.value && (
                  <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>Original: {fv(payTx.value)} · Diferença: {fv(payAmount - payTx.value)}</div>
                )}
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>
                  Data do {payTx.type === 'arec' ? 'Recebimento' : 'Pagamento'}
                </label>
                <input type="date" style={inp} value={payDate} onChange={e => setPayDate(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowPayModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleConfirmPay} style={btn('green')}>{payTx.type === 'arec' ? '✓ Marcar Recebido' : '✓ Marcar Pago'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL CRIAR/EDITAR ─────────────────────────────────────────── */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '440px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Transação' : 'Nova Transação'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Tipo</label>
                <select style={inp} value={form.type || 'entrada'} onChange={e => setForm(p => ({ ...p, type: e.target.value as Transaction['type'] }))}>
                  <option value="entrada">Entrada (recebido)</option>
                  <option value="saida">Despesa (pago)</option>
                  <option value="arec">A Receber</option>
                  <option value="apag">A Pagar</option>
                </select>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Descrição *</label>
                <input style={inp} value={form.description || ''} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Ex: Pagamento cliente XYZ..." />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Valor (R$) *</label>
                  <input type="number" style={inp} value={form.value || ''} onChange={e => setForm(p => ({ ...p, value: Number(e.target.value) }))} placeholder="0" min={0} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Data</label>
                  <input type="date" style={inp} value={form.transaction_date || ''} onChange={e => setForm(p => ({ ...p, transaction_date: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Categoria</label>
                {categories.length > 0
                  ? <select style={inp} value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}><option value="">— Selecionar —</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}</select>
                  : <input style={inp} value={form.category || ''} onChange={e => setForm(p => ({ ...p, category: e.target.value }))} placeholder="Marketing, Equipamentos..." />
                }
              </div>
              {(form.type === 'entrada' || form.type === 'arec') && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Vincular Cliente (opcional)</label>
                  <select style={inp} value={form.client_id || ''} onChange={e => setForm(p => ({ ...p, client_id: e.target.value || undefined }))}>
                    <option value="">— Sem cliente —</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
              )}
              {(form.type === 'saida' || form.type === 'apag') && <div style={{ marginBottom: '8px' }} />}
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

// ─── TxRow: linha de transação reutilizável ───────────────────────────────────
function TxRow({ t, sign, color, onPay, onEdit, onDelete, payLabel, compact }: {
  t: Transaction; sign: string; color: string
  onPay?: (t: Transaction) => void; onEdit?: (t: Transaction) => void
  onDelete?: (id: string) => void; payLabel?: string; compact?: boolean
}) {
  function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
  function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }
  const today = new Date().toISOString().split('T')[0]
  const isOverdue = t.transaction_date && t.transaction_date < today

  return (
    <div className="tx-row" style={{ padding: compact ? '7px 18px' : '10px 18px', borderBottom: '1px solid rgba(255,255,255,.03)', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'default' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: compact ? '12px' : '13px', color: '#f0ece4', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.description || '—'}</div>
        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>{t.category || 'Sem categoria'}</span>
          {t.transaction_date && <span>· {fd(t.transaction_date)}</span>}
          {isOverdue && <span style={{ background: 'rgba(232,93,74,.12)', color: '#e85d4a', borderRadius: '4px', fontSize: '10px', fontWeight: 700, padding: '1px 5px' }}>⚠ Atrasado</span>}
        </div>
      </div>
      <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: compact ? '12px' : '13px', color, flexShrink: 0 }}>{sign}{fv(t.value)}</span>
      <div className="tx-actions" style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
        {onPay && payLabel && (
          <button onClick={() => onPay(t)} style={{ padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, cursor: 'pointer', border: 'none', background: 'rgba(93,184,122,.12)', color: '#5db87a' }}>{payLabel}</button>
        )}
        {onEdit && <button onClick={() => onEdit(t)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: '1px solid #2a2d35', background: 'transparent', color: '#6b7280' }}>✏️</button>}
        {onDelete && <button onClick={() => onDelete(t.id)} style={{ padding: '3px 7px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer', border: 'none', background: 'rgba(232,93,74,.1)', color: '#e85d4a' }}>🗑</button>}
      </div>
    </div>
  )
}
