'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'

function fv(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}
function fd(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const ST_LABEL: Record<string, string> = { orcamento: 'Orçamento', para_captacao: 'Aprovado', producao: 'Em Produção', edicao: 'Edição', enviado: 'Enviado', entregue: 'Finalizado', pausado: 'Pausado', orcamento_desaprovado: 'Reprovado' }
const ST_COLOR: Record<string, string> = { orcamento: '#5b9bd5', para_captacao: '#e8c547', producao: '#e8924a', edicao: '#9b8fd5', enviado: '#5b9bd5', entregue: '#5db87a', pausado: '#555', orcamento_desaprovado: '#e85d4a' }
const PIPELINE = ['para_captacao', 'producao', 'edicao', 'enviado', 'entregue'] as const

interface Client { id: string; name: string }
interface Freelancer { id: string; name: string; area?: string; daily_rate?: number }
interface RentalCompany { id: string; name: string }
interface CustoItem { d: string; v: number; cat?: string; freelancerId?: string }
interface PgtoItem { d: string; v: number; dt: string; rec: boolean }
interface DiariaItem { desc: string; qtd: number; v: number; rentalCompanyId?: string }
interface CostCategory { value: string; label: string }

interface ProjectData {
  custos?: CustoItem[]
  pgtos?: PgtoItem[]
  diarias?: DiariaItem[]
  freeIds?: string[]
  dCapt?: string[]
  dCaptTimes?: string[]
  margem?: number
  briefingUrl?: string
}

interface Project {
  id: string
  name: string
  type?: string
  status: string
  value: number
  delivery_date?: string
  description?: string
  progress: number
  client_id?: string
  data?: ProjectData
  clients?: { name: string } | null
  created_at: string
  quote_token?: string
}

const BLANK_PROJ = (): Partial<Project> & { data: ProjectData } => ({
  name: '', type: '', status: 'orcamento', value: 0,
  delivery_date: '', description: '', progress: 0, client_id: '',
  data: { custos: [], pgtos: [], diarias: [], freeIds: [], dCapt: [], dCaptTimes: [], margem: 0, briefingUrl: '' },
})

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#1a1a1a',
  border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const btn = (v: 'primary' | 'ghost' | 'danger' | 'green') => ({
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer',
  border: v === 'ghost' ? '1px solid #2a2a2a' : 'none',
  background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : v === 'green' ? '#5db87a' : 'transparent',
  color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : v === 'green' ? '#000' : '#888',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
} as React.CSSProperties)

export default function ProjectsPage() {
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [rentalCompanies, setRentalCompanies] = useState<RentalCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'projetos' | 'orcamentos'>('projetos')
  const [subTab, setSubTab] = useState<string>('todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState<Partial<Project> & { data: ProjectData }>(BLANK_PROJ())
  const [saving, setSaving] = useState(false)
  const [viewProject, setViewProject] = useState<Project | null>(null)
  const [costCategories, setCostCategories] = useState<string[]>(['Freela', 'Transporte', 'Estacionamento', 'Alimentação', 'Equipamento', 'Locação', 'Outro'])
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientSaving, setNewClientSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [pr, cr, fr, rc, cfg] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/freelancers').then(r => r.json()),
      fetch('/api/rental-companies').then(r => r.json()).catch(() => []),
      fetch('/api/company-settings').then(r => r.json()).catch(() => ({})),
    ])
    setProjects(Array.isArray(pr) ? pr : [])
    setClients(Array.isArray(cr) ? cr : [])
    setFreelancers(Array.isArray(fr) ? fr : [])
    setRentalCompanies(Array.isArray(rc) ? rc : [])
    if (cfg?.categoriasCusto?.length) setCostCategories(cfg.categoriasCusto)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(BLANK_PROJ())
    setShowModal(true)
  }

  function openEdit(p: Project) {
    setEditing(p)
    setForm({
      name: p.name, type: p.type || '', status: p.status, value: p.value,
      delivery_date: p.delivery_date || '', description: p.description || '',
      progress: p.progress, client_id: p.client_id || '',
      data: {
        custos: p.data?.custos || [],
        pgtos: p.data?.pgtos || [],
        diarias: p.data?.diarias || [],
        freeIds: p.data?.freeIds || [],
        dCapt: p.data?.dCapt || [],
        dCaptTimes: p.data?.dCaptTimes || [],
        margem: p.data?.margem || 0,
        briefingUrl: p.data?.briefingUrl || '',
      },
    })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.show('Informe o nome do projeto', 'error'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/projects/${editing.id}` : '/api/projects'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load()
      setShowModal(false)
      toast.show(editing ? 'Projeto atualizado!' : 'Projeto criado!', 'success')
    } catch (e: unknown) {
      toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este projeto?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await load()
    toast.show('Projeto excluído', 'success')
  }

  async function handleStatusChange(id: string, newStatus: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    setProjects(ps => ps.map(p => p.id === id ? { ...p, status: newStatus } : p))
    if (viewProject?.id === id) setViewProject(v => v ? { ...v, status: newStatus } : v)
  }

  async function handleApprove(id: string) {
    const proj = projects.find(p => p.id === id)
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'para_captacao' }),
    })
    // Criar transações para custos (apag) e recebimentos (arec)
    if (proj) {
      const today = new Date().toISOString().split('T')[0]
      const txs: object[] = []
      // Custos → A Pagar
      for (const c of proj.data?.custos || []) {
        if (Number(c.v) > 0) {
          const freeName = c.freelancerId ? freelancers.find(f => f.id === c.freelancerId)?.name : null
          txs.push({ type: 'apag', value: c.v, description: `${c.cat ? `[${c.cat}] ` : ''}${freeName ? freeName : c.d} — ${proj.name}`, category: c.cat || 'Produção', transaction_date: today })
        }
      }
      // Diárias → A Pagar
      for (const d of proj.data?.diarias || []) {
        const total = Number(d.qtd || 1) * Number(d.v || 0)
        if (total > 0) txs.push({ type: 'apag', value: total, description: `${d.desc} ×${d.qtd} — ${proj.name}`, category: 'Locação', transaction_date: today })
      }
      // Freelancers (freeIds) → A Pagar
      for (const fid of proj.data?.freeIds || []) {
        const fl = freelancers.find(f => f.id === fid)
        if (fl) txs.push({ type: 'apag', value: fl.daily_rate || 0, description: `Freelancer: ${fl.name} — ${proj.name}`, category: 'Freela', transaction_date: today })
      }
      // Recebimentos (pgtos) → A Receber
      for (const pg of proj.data?.pgtos || []) {
        if (!pg.rec && Number(pg.v) > 0) txs.push({ type: 'arec', value: pg.v, description: `${pg.d || 'Pagamento'} — ${proj.name}`, category: 'Projeto', transaction_date: pg.dt || today })
      }
      await Promise.all(txs.map(tx => fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(tx) })))
    }
    await load()
    toast.show('Projeto aprovado! Custos → A Pagar · Recebimentos → A Receber.', 'success')
    setMainTab('projetos')
  }

  async function handleAddClient() {
    if (!newClientName.trim()) return
    setNewClientSaving(true)
    try {
      const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClientName.trim() }) })
      if (!res.ok) throw new Error('Erro')
      const client = await res.json()
      setClients(cs => [...cs, client])
      upd('client_id', client.id)
      setShowAddClient(false)
      setNewClientName('')
      toast.show('Cliente criado!', 'success')
    } catch { toast.show('Erro ao criar cliente', 'error') }
    finally { setNewClientSaving(false) }
  }

  const orcamentos = projects.filter(p => p.status === 'orcamento')
  const projetos = projects.filter(p => p.status !== 'orcamento' && p.status !== 'orcamento_desaprovado')
  const filteredProjetos = subTab === 'todos' ? projetos : projetos.filter(p => p.status === subTab)

  // form helpers
  const upd = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const updData = (k: string, v: unknown) => setForm(f => ({ ...f, data: { ...f.data, [k]: v } }))

  const totalCustos = (form.data?.custos || []).reduce((s, c) => s + Number(c.v || 0), 0)
  const totalDiarias = (form.data?.diarias || []).reduce((s, d) => s + (Number(d.qtd || 1) * Number(d.v || 0)), 0)
  const margem = Number(form.data?.margem || 0)
  const totalBase = totalCustos + totalDiarias
  const valorSugerido = margem > 0 && margem < 100 ? Math.round(totalBase / (1 - margem / 100)) : 0
  const totalRec = (form.data?.pgtos || []).filter(p => p.rec).reduce((s, p) => s + Number(p.v || 0), 0)
  const totalPend = (form.data?.pgtos || []).filter(p => !p.rec).reduce((s, p) => s + Number(p.v || 0), 0)

  // Toggle freelancer
  function toggleFree(id: string) {
    const ids = form.data?.freeIds || []
    updData('freeIds', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>
            {mainTab === 'projetos' ? 'Projetos' : 'Orçamentos'}
          </h1>
          <p style={{ color: '#555', fontSize: '13px' }}>
            {mainTab === 'projetos' ? `${projetos.length} projeto${projetos.length !== 1 ? 's' : ''}` : `${orcamentos.length} aguardando aprovação`}
          </p>
        </div>
        <button onClick={openCreate} style={btn('primary')}>+ Novo {mainTab === 'orcamentos' ? 'Orçamento' : 'Projeto'}</button>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #2a2a2a', marginBottom: '24px' }}>
        {(['projetos', 'orcamentos'] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)} style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', border: 'none', background: 'transparent', color: mainTab === t ? '#e8c547' : '#555', borderBottom: mainTab === t ? '2px solid #e8c547' : '2px solid transparent', marginBottom: '-1px', fontFamily: "'DM Sans', sans-serif", transition: 'all .12s' }}>
            {t === 'projetos' ? `Projetos (${projetos.length})` : `Orçamentos (${orcamentos.length})`}
          </button>
        ))}
      </div>

      {/* ORCAMENTOS */}
      {mainTab === 'orcamentos' && (
        <div>
          {orcamentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '15px', color: '#888', marginBottom: '6px' }}>Nenhum orçamento pendente</div>
              <div style={{ fontSize: '13px' }}>Crie um novo orçamento para um cliente</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {orcamentos.map(p => (
                <div key={p.id} onClick={() => setViewProject(p)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '18px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#5b9bd5' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f0ece4', flex: 1, marginRight: '8px' }}>{p.name}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(91,155,213,.15)', color: '#5b9bd5', fontWeight: 600, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>Em Aprovação</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>👤 {p.clients?.name || '—'}</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const, marginBottom: '12px', fontSize: '11px', color: '#555' }}>
                    {p.delivery_date && <span>📅 {fd(p.delivery_date)}</span>}
                    {p.type && <span>🏷 {p.type}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{fv(p.value)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid #1a1a1a', flexWrap: 'wrap' as const }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(p) }} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '12px' }}>✏️ Editar</button>
                    <button onClick={e => { e.stopPropagation(); handleApprove(p.id) }} style={{ ...btn('green'), flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '12px' }}>✅ Aprovar</button>
                    {p.quote_token && (
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/orcamento/${p.quote_token}`); toast.show('Link copiado!', 'info') }}
                        style={{ ...btn('ghost'), padding: '6px 10px', fontSize: '12px' }} title="Copiar link de aprovação">🔗</button>
                    )}
                    {p.quote_token && (
                      <button onClick={e => { e.stopPropagation(); window.open(`/orcamento/${p.quote_token}`, '_blank') }}
                        style={{ ...btn('ghost'), padding: '6px 10px', fontSize: '12px' }} title="Ver e imprimir PDF">📄</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} style={{ ...btn('danger'), padding: '6px 10px', fontSize: '12px' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROJETOS */}
      {mainTab === 'projetos' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '20px' }}>
            {[
              { key: 'todos', label: `Todos (${projetos.length})` },
              { key: 'para_captacao', label: `Captação (${projetos.filter(p => p.status === 'para_captacao').length})` },
              { key: 'producao', label: `Produção (${projetos.filter(p => p.status === 'producao').length})` },
              { key: 'edicao', label: `Edição (${projetos.filter(p => p.status === 'edicao').length})` },
              { key: 'enviado', label: `Enviado (${projetos.filter(p => p.status === 'enviado').length})` },
              { key: 'entregue', label: `Finalizado (${projetos.filter(p => p.status === 'entregue').length})` },
              { key: 'pausado', label: `Pausado (${projetos.filter(p => p.status === 'pausado').length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: subTab === t.key ? 'rgba(232,197,71,.15)' : '#1a1a1a', color: subTab === t.key ? '#e8c547' : '#555', transition: 'all .12s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {filteredProjetos.length === 0 ? (
            !loading && projects.filter(p => !['orcamento', 'orcamento_desaprovado', 'entregue'].includes(p.status)).length === 0 && subTab === 'todos' ? (
              <EmptyState
                icon="🎬"
                title="Nenhum projeto ainda"
                subtitle="Adicione seu primeiro projeto para começar."
                action="+ Novo Projeto"
                onAction={() => { setMainTab('projetos'); openCreate() }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎬</div>
                <div style={{ fontSize: '15px', color: '#888', marginBottom: '6px' }}>Nenhum projeto aqui</div>
                <div style={{ fontSize: '13px' }}>Aprove um orçamento para iniciar um projeto</div>
              </div>
            )
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {filteredProjetos.map(p => {
                const prog = p.progress || 0
                const pc = prog >= 80 ? '#5db87a' : prog >= 40 ? '#e8c547' : '#5b9bd5'
                const rec = (p.data?.pgtos || []).filter(x => x.rec).reduce((s, x) => s + Number(x.v || 0), 0)
                const pend = Math.max(0, (p.value || 0) - rec)
                return (
                  <div key={p.id} onClick={() => setViewProject(p)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '18px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: ST_COLOR[p.status] || '#555' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f0ece4', flex: 1, marginRight: '8px' }}>{p.name}</div>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: (ST_COLOR[p.status] || '#555') + '22', color: ST_COLOR[p.status] || '#555', fontWeight: 600, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>
                        {ST_LABEL[p.status] || p.status}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>👤 {p.clients?.name || '—'}</div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const, marginBottom: '10px', fontSize: '11px', color: '#555' }}>
                      {p.delivery_date && <span>📅 {fd(p.delivery_date)}</span>}
                      {p.type && <span>🏷 {p.type}</span>}
                    </div>
                    <div style={{ height: '3px', background: '#222', borderRadius: '2px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{ height: '100%', width: `${prog}%`, background: pc, borderRadius: '2px' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{fv(p.value)}</span>
                      {pend > 0 ? <span style={{ fontSize: '11px', color: '#e8924a' }}>⏳ {fv(pend)}</span> : p.status === 'entregue' ? <span style={{ fontSize: '11px', color: '#5db87a' }}>✓ Quitado</span> : <span style={{ fontSize: '11px', color: '#555' }}>{prog}%</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid #1a1a1a', alignItems: 'center' }}>
                      {(() => {
                        const pipeIdx = (PIPELINE as readonly string[]).indexOf(p.status)
                        const prevSt = pipeIdx > 0 ? PIPELINE[pipeIdx - 1] : null
                        const nextSt = pipeIdx >= 0 && pipeIdx < PIPELINE.length - 1 ? PIPELINE[pipeIdx + 1] : null
                        return (
                          <>
                            {prevSt && (
                              <button onClick={e => { e.stopPropagation(); handleStatusChange(p.id, prevSt) }}
                                style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#555', padding: '4px 8px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', flexShrink: 0 }}
                                title={`← ${ST_LABEL[prevSt]}`}>←</button>
                            )}
                            <button onClick={e => { e.stopPropagation(); openEdit(p) }} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center', padding: '6px 8px', fontSize: '12px' }}>✏️</button>
                            {nextSt && (
                              <button onClick={e => { e.stopPropagation(); handleStatusChange(p.id, nextSt) }}
                                style={{ background: (ST_COLOR[nextSt] || '#555') + '22', border: 'none', color: ST_COLOR[nextSt] || '#f0ece4', padding: '6px 10px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
                                title={`→ ${ST_LABEL[nextSt]}`}>{ST_LABEL[nextSt]} →</button>
                            )}
                            <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} style={{ ...btn('danger'), padding: '6px 8px', fontSize: '12px' }}>🗑</button>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Concluídos */}
          {(() => {
            const concluidos = projetos.filter(p => p.status === 'entregue')
            if (concluidos.length === 0) return null
            return (
              <div style={{ marginTop: '32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <div style={{ height: '1px', flex: 1, background: '#1a1a1a' }} />
                  <span style={{ fontSize: '12px', color: '#555', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>✅ Concluídos ({concluidos.length})</span>
                  <div style={{ height: '1px', flex: 1, background: '#1a1a1a' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {concluidos.map(p => {
                    const rec = (p.data?.pgtos || []).filter(x => x.rec).reduce((s, x) => s + Number(x.v || 0), 0)
                    return (
                      <div key={p.id} onClick={() => setViewProject(p)} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', opacity: 0.7 }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5db87a', flexShrink: 0 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '13px', color: '#d1d5db', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</div>
                          <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{p.clients?.name || '—'}{p.delivery_date ? ` · ${fd(p.delivery_date)}` : ''}</div>
                        </div>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#5db87a', flexShrink: 0 }}>{fv(rec)}</span>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={e => { e.stopPropagation(); openEdit(p) }} style={{ ...btn('ghost'), padding: '4px 8px', fontSize: '11px' }}>✏️</button>
                          <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} style={{ ...btn('danger'), padding: '4px 8px', fontSize: '11px' }}>🗑</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* MODAL CREATE/EDIT */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Projeto' : 'Novo Projeto / Orçamento'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
            </div>

            <div style={{ padding: '24px', flex: 1 }}>
              {/* Row 1: name + client */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Nome do Projeto *</label>
                  <input style={inp} value={form.name || ''} onChange={e => upd('name', e.target.value)} placeholder="Vídeo institucional..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Cliente</label>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <select style={{ ...inp, flex: 1 }} value={form.client_id || ''} onChange={e => upd('client_id', e.target.value)}>
                      <option value="">Selecionar...</option>
                      {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowAddClient(s => !s)} style={{ ...btn('ghost'), padding: '8px 12px', flexShrink: 0, fontWeight: 700, fontSize: '16px' }} title="Novo cliente">+</button>
                  </div>
                  {showAddClient && (
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                      <input autoFocus style={{ ...inp, flex: 1 }} value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nome do cliente..." onKeyDown={e => e.key === 'Enter' && handleAddClient()} />
                      <button type="button" onClick={handleAddClient} disabled={newClientSaving} style={{ ...btn('primary'), padding: '8px 12px', flexShrink: 0 }}>{newClientSaving ? '...' : '✓'}</button>
                      <button type="button" onClick={() => { setShowAddClient(false); setNewClientName('') }} style={{ ...btn('ghost'), padding: '8px 12px', flexShrink: 0 }}>✕</button>
                    </div>
                  )}
                </div>
              </div>

              {/* Row 2: type + status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Tipo</label>
                  <input style={inp} value={form.type || ''} onChange={e => upd('type', e.target.value)} placeholder="Corporativo, Evento..." />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Status</label>
                  <select style={{ ...inp }} value={form.status || 'orcamento'} onChange={e => upd('status', e.target.value)}>
                    <option value="orcamento">Orçamento</option>
                    <option value="para_captacao">Aprovado / Para Captação</option>
                    <option value="producao">Em Produção</option>
                    <option value="edicao">Edição</option>
                    <option value="enviado">Enviado</option>
                    <option value="entregue">Finalizado / Entregue</option>
                    <option value="pausado">Pausado</option>
                    <option value="orcamento_desaprovado">Reprovado</option>
                  </select>
                </div>
              </div>

              {/* Row 3: delivery_date */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Data de Entrega</label>
                <input type="date" style={inp} value={form.delivery_date || ''} onChange={e => upd('delivery_date', e.target.value)} />
              </div>
              {editing && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Progresso (%)</label>
                  <input type="number" style={inp} value={form.progress || 0} onChange={e => upd('progress', Number(e.target.value))} min={0} max={100} />
                </div>
              )}

              {/* Briefing */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Briefing</label>
                <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="Descreva o projeto, referências, observações..." />
              </div>

              {/* Briefing URL */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Link do Briefing / Anexo</label>
                <input style={inp} value={form.data?.briefingUrl || ''} onChange={e => updData('briefingUrl', e.target.value)} placeholder="https://drive.google.com/... ou outro link" />
              </div>

              {/* Freelancers */}
              {freelancers.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Freelancers</label>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const }}>
                    {freelancers.map(f => {
                      const sel = (form.data?.freeIds || []).includes(f.id)
                      return (
                        <button key={f.id} onClick={() => toggleFree(f.id)}
                          style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: sel ? 'rgba(232,197,71,.2)' : '#1a1a1a', color: sel ? '#e8c547' : '#555', transition: 'all .12s' }}>
                          {f.name}{f.area ? ` · ${f.area}` : ''}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Capture dates */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>📅 Datas de Captação</span>
                  <button onClick={() => { updData('dCapt', [...(form.data?.dCapt || []), '']); updData('dCaptTimes', [...(form.data?.dCaptTimes || []), '']) }} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                </div>
                {(form.data?.dCapt || []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                    <input type="date" style={{ ...inp, flex: 2 }} value={d} onChange={e => { const arr = [...(form.data?.dCapt || [])]; arr[i] = e.target.value; updData('dCapt', arr) }} />
                    <input type="time" style={{ ...inp, flex: 1 }} value={(form.data?.dCaptTimes || [])[i] || ''} onChange={e => { const arr = [...(form.data?.dCaptTimes || Array((form.data?.dCapt || []).length).fill(''))]; arr[i] = e.target.value; updData('dCaptTimes', arr) }} placeholder="Hora" />
                    <button onClick={() => { const dates = [...(form.data?.dCapt || [])]; const times = [...(form.data?.dCaptTimes || [])]; dates.splice(i, 1); times.splice(i, 1); updData('dCapt', dates); updData('dCaptTimes', times) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                  </div>
                ))}
              </div>

              {/* Costs */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>🧮 Custos</span>
                  <button onClick={() => updData('custos', [...(form.data?.custos || []), { d: '', v: 0 }])} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                </div>
                {(form.data?.custos || []).map((c, i) => (
                  <div key={i} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', gap: '8px', marginBottom: c.cat === 'Freela' ? '4px' : '0' }}>
                      <select style={{ ...inp, flex: '0 0 130px' as unknown as number }} value={c.cat || ''} onChange={e => { const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], cat: e.target.value, freelancerId: '' }; updData('custos', arr) }}>
                        <option value="">Categoria</option>
                        {costCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                      </select>
                      {c.cat !== 'Freela' && (
                        <input style={{ ...inp, flex: 2 }} value={c.d} onChange={e => { const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], d: e.target.value }; updData('custos', arr) }} placeholder="Descrição..." />
                      )}
                      {c.cat === 'Freela' && (
                        <select style={{ ...inp, flex: 2, color: c.freelancerId ? '#f0ece4' : '#555' }} value={c.freelancerId || ''} onChange={e => { const fl = freelancers.find(f => f.id === e.target.value); const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], freelancerId: e.target.value, d: fl?.name || '' }; updData('custos', arr) }}>
                          <option value="">Selecionar Freela...</option>
                          {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}{f.area ? ` · ${f.area}` : ''}</option>)}
                        </select>
                      )}
                      <input type="number" style={{ ...inp, flex: 1, minWidth: '80px' }} value={c.v || ''} onChange={e => { const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], v: Number(e.target.value) || 0 }; updData('custos', arr) }} placeholder="R$" />
                      <button onClick={() => { const arr = [...(form.data?.custos || [])]; arr.splice(i, 1); updData('custos', arr) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                    </div>
                    {c.cat === 'Freela' && c.freelancerId && (
                      <div style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>
                        💡 O valor será vinculado ao freelancer no contas a pagar ao aprovar
                      </div>
                    )}
                  </div>
                ))}
                {(form.data?.custos || []).length > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>Total custos: <strong style={{ color: '#f0ece4' }}>{fv(totalCustos)}</strong></div>}
              </div>

              {/* Diárias */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>🎬 Diárias e Locações</span>
                  <button onClick={() => updData('diarias', [...(form.data?.diarias || []), { desc: '', qtd: 1, v: 0 }])} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                </div>
                {(form.data?.diarias || []).map((d, i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <input style={{ ...inp, flex: 2 }} value={d.desc} onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], desc: e.target.value }; updData('diarias', arr) }} placeholder="Câmera, drone, espaço..." />
                      <input type="number" style={{ ...inp, flex: '0 0 60px' as unknown as number, minWidth: '60px' }} value={d.qtd || 1} min={1} onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], qtd: Number(e.target.value) || 1 }; updData('diarias', arr) }} title="Qtd dias" />
                      <input type="number" style={{ ...inp, flex: 1, minWidth: '80px' }} value={d.v || ''} onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], v: Number(e.target.value) || 0 }; updData('diarias', arr) }} placeholder="R$/dia" />
                      <span style={{ fontSize: '11px', color: '#e8c547', whiteSpace: 'nowrap' as const }}>{fv((d.qtd || 1) * Number(d.v || 0))}</span>
                      <button onClick={() => { const arr = [...(form.data?.diarias || [])]; arr.splice(i, 1); updData('diarias', arr) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                    </div>
                    {rentalCompanies.length > 0 && (
                      <select
                        style={{ ...inp, fontSize: '12px', color: d.rentalCompanyId ? '#f0ece4' : '#555' }}
                        value={d.rentalCompanyId || ''}
                        onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], rentalCompanyId: e.target.value }; updData('diarias', arr) }}
                      >
                        <option value="">🏢 Empresa de locação (opcional)</option>
                        {rentalCompanies.map(rc => (
                          <option key={rc.id} value={rc.id}>{rc.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}
                {(form.data?.diarias || []).length > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>Total diárias: <strong style={{ color: '#f0ece4' }}>{fv(totalDiarias)}</strong></div>}
              </div>

              {/* Margin + value */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ background: '#0d0f12', borderRadius: '8px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                  <span>Custos: <strong style={{ color: '#e85d4a' }}>{fv(totalCustos)}</strong></span>
                  <span>Diárias: <strong style={{ color: '#e8924a' }}>{fv(totalDiarias)}</strong></span>
                  <span>Total base: <strong style={{ color: '#f0ece4' }}>{fv(totalBase)}</strong></span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Margem (%)</label>
                    <input type="number" style={inp} value={form.data?.margem || ''} onChange={e => updData('margem', Number(e.target.value))} placeholder="Ex: 40" min={0} max={99} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor sugerido</label>
                    <input style={{ ...inp, color: '#e8c547' }} value={valorSugerido > 0 ? fv(valorSugerido) : ''} readOnly placeholder="—" />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor final (R$) *</label>
                    <input type="number" style={inp} value={form.value || ''} onChange={e => upd('value', Number(e.target.value))} placeholder="0" />
                  </div>
                </div>
              </div>

              {/* Payments */}
              <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>💰 Recebimentos</span>
                  <button onClick={() => updData('pgtos', [...(form.data?.pgtos || []), { d: '', v: 0, dt: '', rec: false }])} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                </div>
                {(form.data?.pgtos || []).map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                    <input style={{ ...inp, flex: '2 1 120px' as unknown as number }} value={p.d} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], d: e.target.value }; updData('pgtos', arr) }} placeholder="Sinal 50%..." />
                    <input type="number" style={{ ...inp, flex: '1 1 80px' as unknown as number, minWidth: '80px' }} value={p.v || ''} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], v: Number(e.target.value) || 0 }; updData('pgtos', arr) }} placeholder="R$" />
                    <input type="date" style={{ ...inp, flex: '1 1 120px' as unknown as number, minWidth: '110px' }} value={p.dt} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], dt: e.target.value }; updData('pgtos', arr) }} />
                    <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                      <input type="checkbox" checked={p.rec} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], rec: e.target.checked }; updData('pgtos', arr) }} style={{ accentColor: '#5db87a' }} /> Recebido
                    </label>
                    <button onClick={() => { const arr = [...(form.data?.pgtos || [])]; arr.splice(i, 1); updData('pgtos', arr) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                  </div>
                ))}
                {(form.data?.pgtos || []).length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                    <span>Recebido: <strong style={{ color: '#5db87a' }}>{fv(totalRec)}</strong></span>
                    <span>A receber: <strong style={{ color: '#e8924a' }}>{fv(totalPend)}</strong></span>
                  </div>
                )}
              </div>
            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'flex-end', gap: '10px', position: 'sticky', bottom: 0, background: '#111' }}>
              <button onClick={() => setShowModal(false)} style={btn('ghost')}>Cancelar</button>
              <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar projeto'}</button>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {viewProject && (() => {
        const p = viewProject
        const st = { label: ST_LABEL[p.status] || p.status, color: ST_COLOR[p.status] || '#555' }
        const recebido = (p.data?.pgtos || []).filter(pg => pg.rec).reduce((s, pg) => s + Number(pg.v || 0), 0)
        const aReceber = (p.data?.pgtos || []).filter(pg => !pg.rec).reduce((s, pg) => s + Number(pg.v || 0), 0)
        const custoTotal = (p.data?.custos || []).reduce((s, c) => s + Number(c.v || 0), 0)
        const diariasTotal = (p.data?.diarias || []).reduce((s, d) => s + (Number(d.qtd || 1) * Number(d.v || 0)), 0)
        const totalCustos = custoTotal + diariasTotal
        const freeNames = (p.data?.freeIds || []).map(id => freelancers.find(f => f.id === id)?.name).filter(Boolean)
        const captDates = (p.data?.dCapt || []).filter(Boolean)

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.75)', padding: '20px' }}
            onClick={() => setViewProject(null)}>
            <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', width: '100%', maxWidth: '760px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>

              {/* ── Header ── */}
              <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #1e1e1e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', fontWeight: 700, color: '#f0ece4', margin: 0 }}>{p.name}</h2>
                  <button onClick={() => setViewProject(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 0 0 12px' }}>×</button>
                </div>
                {/* Status tags row */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', background: st.color + '28', color: st.color, fontWeight: 700, fontSize: '11px', letterSpacing: '.5px', textTransform: 'uppercase' as const }}>{st.label}</span>
                  {p.type && <span style={{ color: '#888' }}>{p.type}</span>}
                  {p.clients?.name && <span style={{ color: '#888' }}>👤 {p.clients.name}</span>}
                  {p.delivery_date && <span style={{ color: '#888' }}>📅 Entrega {fd(p.delivery_date)}</span>}
                  {p.status !== 'orcamento' && <span style={{ color: '#5db87a', fontWeight: 600, fontSize: '12px' }}>✅ Aprovado pelo cliente</span>}
                </div>
              </div>

              {/* ── Scrollable body ── */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

                {/* KPI Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  {[
                    { label: 'VALOR DO PROJETO', value: fv(p.value), color: '#f0ece4' },
                    { label: 'RECEBIDO',          value: fv(recebido), color: '#5db87a' },
                    { label: 'A RECEBER',          value: fv(aReceber), color: aReceber > 0 ? '#e8924a' : '#555' },
                  ].map(k => (
                    <div key={k.label} style={{ border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px' }}>
                      <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '8px' }}>{k.label}</div>
                      <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    <span>Progresso</span>
                    <span style={{ color: '#e8c547', fontWeight: 600 }}>{p.progress || 0}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.progress || 0}%`, background: '#e8c547', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Captações + Freelancers */}
                {(captDates.length > 0 || freeNames.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {captDates.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#d1d5db' }}>
                        <span style={{ marginRight: '6px' }}>📷</span>
                        <span style={{ color: '#888' }}>Captações: </span>
                        {captDates.map((d, i) => {
                          const t = (p.data?.dCaptTimes || [])[i]
                          return (fd(d) + (t ? ` ${t}` : ''))
                        }).join(' · ')}
                      </div>
                    )}
                    {freeNames.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#d1d5db' }}>
                        <span style={{ marginRight: '6px' }}>👥</span>
                        <span style={{ color: '#888' }}>Freelancers: </span>
                        {freeNames.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Briefing */}
                {p.description && (
                  <div style={{ border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
                    {p.description}
                  </div>
                )}

                {/* Briefing link */}
                {p.data?.briefingUrl && (
                  <a href={p.data.briefingUrl} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#5b9bd5', fontSize: '13px', textDecoration: 'none' }}>
                    📎 Ver briefing / anexo →
                  </a>
                )}

                {/* Custos de produção */}
                {totalCustos > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🎬</span> Custos de produção
                    </div>
                    <div style={{ border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden' }}>
                      {(p.data?.custos || []).map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                          <span style={{ color: '#d1d5db' }}>{c.cat ? <span style={{ color: '#555', fontSize: '11px', marginRight: '6px' }}>[{c.cat}]</span> : null}{c.d}</span>
                          <span style={{ color: '#f0ece4', fontWeight: 500 }}>{fv(Number(c.v || 0))}</span>
                        </div>
                      ))}
                      {(p.data?.diarias || []).map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                          <span style={{ color: '#d1d5db' }}>{d.desc}{d.qtd > 1 ? ` ×${d.qtd}` : ''}{d.rentalCompanyId ? <span style={{ color: '#555', fontSize: '11px', marginLeft: '6px' }}>({rentalCompanies.find(r => r.id === d.rentalCompanyId)?.name || ''})</span> : null}</span>
                          <span style={{ color: '#f0ece4', fontWeight: 500 }}>{fv(Number(d.qtd || 1) * Number(d.v || 0))}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: '13px', fontWeight: 700, background: '#0d0f12' }}>
                        <span style={{ color: '#f0ece4' }}>Total</span>
                        <span style={{ color: '#f0ece4' }}>{fv(totalCustos)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recebimentos */}
                {(p.data?.pgtos || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💰</span> Recebimentos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.data!.pgtos!.map((pg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #2a2a2a', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{pg.d || `Parcela ${i + 1}`}</div>
                            {pg.dt && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{fd(pg.dt)}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: '#f0ece4' }}>{fv(Number(pg.v || 0))}</span>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: pg.rec ? 'rgba(93,184,122,.15)' : 'rgba(232,146,74,.15)', color: pg.rec ? '#5db87a' : '#e8924a' }}>
                              {pg.rec ? 'Recebido' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* ── Footer buttons ── */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const }}>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(() => {
                    const pipeIdx = (PIPELINE as readonly string[]).indexOf(p.status)
                    const prevSt = pipeIdx > 0 ? PIPELINE[pipeIdx - 1] : null
                    const nextSt = pipeIdx >= 0 && pipeIdx < PIPELINE.length - 1 ? PIPELINE[pipeIdx + 1] : null
                    return (
                      <>
                        {prevSt && <button onClick={() => handleStatusChange(p.id, prevSt)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← {ST_LABEL[prevSt]}</button>}
                        {nextSt && <button onClick={() => handleStatusChange(p.id, nextSt)} style={{ background: (ST_COLOR[nextSt] || '#555') + '22', border: 'none', color: ST_COLOR[nextSt] || '#f0ece4', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{ST_LABEL[nextSt]} →</button>}
                      </>
                    )
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  <button onClick={() => setViewProject(null)} style={{ ...btn('ghost'), padding: '8px 16px' }}>Fechar</button>
                  {p.quote_token && (
                    <button onClick={() => window.open(`/orcamento/${p.quote_token}`, '_blank')} style={{ ...btn('ghost'), padding: '8px 14px' }}>📄</button>
                  )}
                  {p.quote_token && (
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/orcamento/${p.quote_token}`); toast.show('Link copiado!', 'info') }} style={{ ...btn('ghost'), padding: '8px 14px' }}>🔗</button>
                  )}
                  {p.status === 'orcamento' && (
                    <button onClick={() => { handleApprove(p.id); setViewProject(null) }} style={{ ...btn('green'), padding: '8px 16px' }}>✅ Aprovar</button>
                  )}
                  <button onClick={() => { setViewProject(null); openEdit(p) }} style={{ ...btn('primary'), padding: '8px 16px' }}>✏️ Editar</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
