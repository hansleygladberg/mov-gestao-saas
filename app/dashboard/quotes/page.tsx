'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }
function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }

interface Client { id: string; name: string; email?: string }
interface Project {
  id: string; name: string; type?: string; status: string; value: number
  delivery_date?: string; description?: string; progress: number
  clients?: Client | null; created_at: string; quote_token?: string
}

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btnS = (v: 'primary' | 'ghost' | 'danger') => ({ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: v === 'ghost' ? '1px solid #2a2d35' : 'none', background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent', color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#6b7280', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties)

export default function QuotesPage() {
  const toast = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'orcamentos'>('orcamentos')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('todos')
  const [showArchived, setShowArchived] = useState(false)
  const [hoveredRow, setHoveredRow] = useState<string | null>(null)

  // New client mini-modal
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientForm, setClientForm] = useState({ name: '', email: '', whatsapp: '' })
  const [savingClient, setSavingClient] = useState(false)


  const load = useCallback(async () => {
    setLoading(true)
    const [projRes, clRes] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
    ])
    setProjects(Array.isArray(projRes) ? projRes.filter((p: Project) => p.status === 'orcamento' || p.status === 'orcamento_desaprovado') : [])
    setClients(Array.isArray(clRes) ? clRes : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function copyLink(token: string) {
    const url = `${window.location.origin}/orcamento/${token}`
    navigator.clipboard.writeText(url).then(() => toast.show('Link copiado!', 'info')).catch(() => toast.show(url, 'info'))
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este orçamento?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await load()
  }

  async function saveNewClient() {
    if (!clientForm.name.trim()) { toast.show('Informe o nome', 'error'); return }
    setSavingClient(true)
    try {
      const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientForm) })
      if (!r.ok) throw new Error((await r.json()).error)
      const newClient = await r.json()
      setClients(prev => [...prev, newClient])
      setShowClientModal(false)
      setClientForm({ name: '', email: '', whatsapp: '' })
      toast.show('Cliente criado!', 'success')
    } catch (e: unknown) { toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error') }
    finally { setSavingClient(false) }
  }

  if (loading) return <div style={{ padding: '40px', color: '#555', textAlign: 'center', background: '#0d0f12', minHeight: '100vh', fontFamily: "'Montserrat', sans-serif" }}>Carregando...</div>

  // Metrics
  const drafts = projects.filter(p => p.status === 'orcamento')
  const sent = projects.filter(p => p.quote_token)
  const approved = projects.filter(p => p.status !== 'orcamento' && p.status !== 'orcamento_desaprovado')
  const totalValue = projects.reduce((s, p) => s + p.value, 0)

  // Filtered projects
  const visibleProjects = projects.filter(p => {
    if (!showArchived && p.status === 'orcamento_desaprovado') return false
    if (filterStatus === 'aguardando' && p.status !== 'orcamento') return false
    if (filterStatus === 'reprovados' && p.status !== 'orcamento_desaprovado') return false
    if (search.trim()) {
      const q = search.toLowerCase()
      const clientName = p.clients?.name?.toLowerCase() || ''
      if (!p.name.toLowerCase().includes(q) && !clientName.includes(q) && !p.id.toLowerCase().includes(q)) return false
    }
    return true
  })

  const labelStyle: React.CSSProperties = { fontSize: '11px', textTransform: 'uppercase', color: '#555555', letterSpacing: '1px', marginBottom: '6px', display: 'block' }
  const metricValueStyle: React.CSSProperties = { fontSize: '28px', fontWeight: 700, color: '#f0ece4', lineHeight: 1 }

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px', margin: '0 0 4px 0' }}>
            Gestão de Orçamentos
          </h1>
          <p style={{ color: '#555555', fontSize: '13px', margin: 0 }}>Gerencie todos os seus orçamentos em um só lugar</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => { window.location.href = '/dashboard/contracts' }}
            style={btnS('ghost')}
          >
            📋 Contrato
          </button>
          <button
            onClick={() => { window.location.href = '/dashboard/projects?new=1' }}
            style={btnS('primary')}
          >
            + Novo Orçamento
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '0', borderBottom: '1px solid #2a2d35', marginBottom: '24px' }}>
        {([
          { key: 'orcamentos', label: 'Orçamentos' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? '2px solid #e8c547' : '2px solid transparent',
              color: activeTab === tab.key ? '#f0ece4' : '#555555',
              fontSize: '13px',
              fontWeight: activeTab === tab.key ? 600 : 400,
              cursor: 'pointer',
              marginBottom: '-1px',
              fontFamily: "'Montserrat', sans-serif",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Rascunhos', value: drafts.length.toString(), color: '#f0ece4' },
          { label: 'Enviados', value: sent.length.toString(), color: '#f0ece4' },
          { label: 'Aprovados', value: approved.length.toString(), color: '#f0ece4' },
          { label: 'Valor Total', value: fv(totalValue), color: '#e8c547' },
        ].map(card => (
          <div
            key={card.label}
            style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '12px', padding: '16px 20px' }}
          >
            <span style={labelStyle}>{card.label}</span>
            <span style={{ ...metricValueStyle, color: card.color }}>{card.value}</span>
          </div>
        ))}
      </div>

      {/* Search and Filters */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', alignItems: 'center' }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
          <input
            type="text"
            placeholder="Buscar por título, número ou cliente..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inp, paddingLeft: '36px' }}
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ ...inp, width: 'auto', cursor: 'pointer', paddingRight: '32px' }}
        >
          <option value="todos">Todos</option>
          <option value="aguardando">Aguardando</option>
          <option value="reprovados">Reprovados</option>
        </select>
        <button
          onClick={() => setShowArchived(v => !v)}
          style={{
            ...btnS('ghost'),
            background: showArchived ? 'rgba(232,197,71,.08)' : 'transparent',
            borderColor: showArchived ? 'rgba(232,197,71,.3)' : '#2a2d35',
            color: showArchived ? '#e8c547' : '#6b7280',
            whiteSpace: 'nowrap',
          }}
        >
          📁 Arquivados
        </button>
      </div>

      {/* Orçamentos Table */}
      {visibleProjects.length === 0 ? (
        <EmptyState
          icon="📋"
          title="Nenhum orçamento encontrado"
          subtitle='Crie um projeto com status "Orçamento" para que ele apareça aqui.'
          action="+ Criar orçamento"
          onAction={() => { window.location.href = '/dashboard/projects' }}
        />
      ) : (
        <div style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#0d0f12' }}>
                {['Número', 'Título', 'Cliente', 'Valor', 'Status', 'Data', 'Validade', 'Ações'].map(col => (
                  <th key={col} style={{ padding: '12px 16px', textAlign: 'left', fontSize: '11px', textTransform: 'uppercase' as const, color: '#555555', letterSpacing: '1px', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleProjects.map((p, i) => {
                const isHovered = hoveredRow === p.id
                const clientObj = p.clients ?? clients.find(c => c.id === (p as unknown as Record<string, string>).client_id)
                const statusBadge = p.status === 'orcamento'
                  ? { label: 'Aguardando', color: '#5b9bd5' }
                  : p.status === 'orcamento_desaprovado'
                    ? { label: 'Reprovado', color: '#e85d4a' }
                    : { label: 'Aprovado', color: '#5db87a' }
                const orcNum = `ORC-${p.id.slice(0, 8).toUpperCase()}`

                return (
                  <tr
                    key={p.id}
                    onMouseEnter={() => setHoveredRow(p.id)}
                    onMouseLeave={() => setHoveredRow(null)}
                    style={{
                      borderTop: i > 0 ? '1px solid #1a1d24' : 'none',
                      background: isHovered ? '#161920' : 'transparent',
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Número */}
                    <td style={{ padding: '14px 16px', fontSize: '11px', color: '#555555', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                      {orcNum}
                    </td>

                    {/* Título */}
                    <td style={{ padding: '14px 16px', maxWidth: '200px' }}>
                      <span style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 600, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {p.name}
                      </span>
                      {p.type && <span style={{ fontSize: '11px', color: '#555555' }}>{p.type}</span>}
                    </td>

                    {/* Cliente */}
                    <td style={{ padding: '14px 16px' }}>
                      {clientObj ? (
                        <>
                          <span style={{ fontSize: '13px', color: '#f0ece4', display: 'block' }}>{clientObj.name}</span>
                          {clientObj.email && <span style={{ fontSize: '11px', color: '#555555' }}>{clientObj.email}</span>}
                        </>
                      ) : (
                        <span style={{ fontSize: '13px', color: '#555555' }}>—</span>
                      )}
                    </td>

                    {/* Valor */}
                    <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                      <span style={{ fontSize: '13px', color: '#e8c547', fontWeight: 600 }}>{fv(p.value)}</span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        background: statusBadge.color + '22',
                        color: statusBadge.color,
                        whiteSpace: 'nowrap',
                      }}>
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Data */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {fd(p.created_at)}
                    </td>

                    {/* Validade */}
                    <td style={{ padding: '14px 16px', fontSize: '12px', color: '#6b7280', whiteSpace: 'nowrap' }}>
                      {p.delivery_date ? fd(p.delivery_date) : '—'}
                    </td>

                    {/* Ações */}
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {p.quote_token && (
                          <>
                            <button
                              onClick={() => copyLink(p.quote_token!)}
                              title="Copiar link de aprovação"
                              style={{ padding: '5px 8px', background: 'rgba(232,197,71,.08)', border: '1px solid rgba(232,197,71,.2)', borderRadius: '6px', color: '#e8c547', fontSize: '12px', cursor: 'pointer' }}
                            >
                              🔗
                            </button>
                            <button
                              onClick={() => window.open(`/orcamento/${p.quote_token}`, '_blank')}
                              title="Ver PDF"
                              style={{ padding: '5px 8px', background: 'rgba(91,155,213,.08)', border: '1px solid rgba(91,155,213,.2)', borderRadius: '6px', color: '#5b9bd5', fontSize: '12px', cursor: 'pointer' }}
                            >
                              📄
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => { window.location.href = `/dashboard/projects` }}
                          title="Editar"
                          style={{ padding: '5px 8px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '6px', color: '#6b7280', fontSize: '12px', cursor: 'pointer' }}
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(p.id)}
                          title="Excluir"
                          style={{ padding: '5px 8px', background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.15)', borderRadius: '6px', color: '#e85d4a', fontSize: '12px', cursor: 'pointer' }}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Mini-modal novo cliente */}
      {showClientModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #2a2d35', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4', margin: 0 }}>Novo Cliente</h3>
              <button onClick={() => setShowClientModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {[
                { key: 'name', label: 'Nome / Empresa *', placeholder: 'Empresa XYZ', type: 'text' },
                { key: 'whatsapp', label: 'WhatsApp', placeholder: '(85) 9 0000-0000', type: 'text' },
                { key: 'email', label: 'E-mail', placeholder: 'contato@empresa.com', type: 'email' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>{f.label}</label>
                  <input type={f.type} style={inp} value={(clientForm as Record<string, string>)[f.key]} onChange={e => setClientForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' }}>
                <button onClick={() => setShowClientModal(false)} style={btnS('ghost')}>Cancelar</button>
                <button onClick={saveNewClient} disabled={savingClient} style={btnS('primary')}>{savingClient ? 'Salvando...' : 'Criar cliente'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
