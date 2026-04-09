'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }

interface Client {
  id: string; name: string; segment?: string; phone?: string; email?: string
  whatsapp?: string; monthly_value?: number; notes?: string; created_at: string
  client_type?: 'empresa' | 'pessoa'; contact_name?: string; prospection_source?: string
}

interface Project {
  id: string; name: string; status: string; value: number; delivery_date?: string
  created_at: string; client_id?: string
  data?: { custos?: { v: number }[]; diarias?: { qtd: number; v: number }[] }
}

const BLANK = (): Partial<Client> => ({ name: '', segment: '', phone: '', email: '', whatsapp: '', monthly_value: 0, notes: '', client_type: 'empresa', contact_name: '', prospection_source: '' })

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btn = (v: 'primary' | 'ghost' | 'danger' | 'outline') => ({
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer',
  border: v === 'ghost' ? '1px solid #2a2a2a' : v === 'outline' ? '1px solid #333' : 'none',
  background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent',
  color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#888',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
} as React.CSSProperties)

const AVATAR_COLORS = ['#e8c547', '#5db87a', '#5b9bd5', '#e8924a', '#9b8fd5', '#e85d4a']
function avatarColor(name: string) { return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] }

const STATUS_COLORS: Record<string, string> = {
  orcamento: '#5b9bd5',
  para_captacao: '#e8c547',
  producao: '#e8924a',
  edicao: '#9b8fd5',
  enviado: '#5b9bd5',
  entregue: '#5db87a',
  pausado: '#555',
}

const STATUS_LABELS: Record<string, string> = {
  orcamento: 'Orçamento',
  para_captacao: 'Para Captação',
  producao: 'Produção',
  edicao: 'Edição',
  enviado: 'Enviado',
  entregue: 'Entregue',
  pausado: 'Pausado',
}

function StatusBadge({ status }: { status: string }) {
  const color = STATUS_COLORS[status] || '#555'
  return (
    <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: '4px', padding: '2px 7px', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' as const }}>
      {STATUS_LABELS[status] || status}
    </span>
  )
}

export default function ClientsPage() {
  const toast = useToast()
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<Partial<Client>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [perms, setPerms] = useState<Record<string, boolean>>({ view: true, create: true, edit: true, delete: true })
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [captacoes, setCaptacoes] = useState<string[]>([])

  // View modal state
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [clientProjects, setClientProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [res, meRes, settingsRes] = await Promise.all([
      fetch('/api/clients'),
      fetch('/api/me').catch(() => null),
      fetch('/api/company-settings').catch(() => null),
    ])
    const d = await res.json()
    setClients(Array.isArray(d) ? d : [])
    if (meRes?.ok) {
      const me = await meRes.json()
      if (me?.user?.role !== 'admin' && me?.user?.permissions?.clientes) {
        setPerms(me.user.permissions.clientes as Record<string, boolean>)
      }
    }
    if (settingsRes?.ok) {
      const s = await settingsRes.json()
      setCaptacoes(s?.captacoes || [])
    }
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(BLANK()); setShowModal(true) }
  function openEdit(c: Client) {
    setEditing(c)
    setForm({ name: c.name, segment: c.segment || '', phone: c.phone || '', email: c.email || '', whatsapp: c.whatsapp || '', monthly_value: c.monthly_value || 0, notes: c.notes || '', client_type: c.client_type || 'empresa', contact_name: c.contact_name || '', prospection_source: c.prospection_source || '' })
    setShowModal(true)
  }

  async function openView(c: Client) {
    setViewClient(c)
    setClientProjects([])
    setLoadingProjects(true)
    try {
      const r = await fetch('/api/projects')
      const d = await r.json()
      const all: Project[] = Array.isArray(d) ? d : []
      setClientProjects(all.filter(p => p.client_id === c.id))
    } catch {
      setClientProjects([])
    } finally {
      setLoadingProjects(false)
    }
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.show('Informe o nome', 'error'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/clients/${editing.id}` : '/api/clients'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load(); setShowModal(false); toast.show(editing ? 'Cliente atualizado!' : 'Cliente criado!', 'success')
    } catch (e: unknown) { toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' }); await load(); toast.show('Cliente excluído', 'success')
  }

  function copyRegistrationLink() {
    const link = window.location.origin + '/cadastro'
    navigator.clipboard.writeText(link).then(() => toast.show('Link copiado!', 'success')).catch(() => toast.show('Erro ao copiar link', 'error'))
  }

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (c.segment || '').toLowerCase().includes(search.toLowerCase())
  )

  // Metrics
  const now = new Date()
  const thisMonth = clients.filter(c => {
    const d = new Date(c.created_at)
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  }).length
  const totalMonthly = clients.reduce((s, c) => s + (c.monthly_value || 0), 0)
  const clientsWithData = clients.filter(c => c.notes || c.phone || c.whatsapp).length

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center', fontFamily: "'Montserrat', sans-serif" }}>Carregando...</div>

  // Detail modal computed stats
  const totalValue = clientProjects.reduce((s, p) => s + (p.value || 0), 0)
  const ticketMedio = clientProjects.length > 0 ? totalValue / clientProjects.length : 0
  const lastProject = clientProjects.length > 0
    ? [...clientProjects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0a0a0a', minHeight: '100vh', padding: '28px' }}>

      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', margin: 0, marginBottom: '4px' }}>Clientes</h1>
          <p style={{ color: '#555', fontSize: '13px', margin: 0 }}>Gerencie todos os seus clientes cadastrados</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* View toggle */}
          <div style={{ display: 'flex', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', overflow: 'hidden' }}>
            <button
              onClick={() => setViewMode('grid')}
              title="Visualização em grade"
              style={{ padding: '7px 11px', background: viewMode === 'grid' ? '#1a1a1a' : 'transparent', border: 'none', color: viewMode === 'grid' ? '#f0ece4' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s' }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="1" width="6" height="6" rx="1"/><rect x="9" y="1" width="6" height="6" rx="1"/>
                <rect x="1" y="9" width="6" height="6" rx="1"/><rect x="9" y="9" width="6" height="6" rx="1"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Visualização em lista"
              style={{ padding: '7px 11px', background: viewMode === 'list' ? '#1a1a1a' : 'transparent', border: 'none', color: viewMode === 'list' ? '#f0ece4' : '#555', cursor: 'pointer', display: 'flex', alignItems: 'center', transition: 'all .15s' }}
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor">
                <rect x="1" y="2" width="14" height="2.5" rx="1"/><rect x="1" y="6.75" width="14" height="2.5" rx="1"/>
                <rect x="1" y="11.5" width="14" height="2.5" rx="1"/>
              </svg>
            </button>
          </div>
          <button onClick={copyRegistrationLink} style={{ ...btn('outline'), color: '#888', fontSize: '13px' }}>
            🔗 Link de Cadastro
          </button>
          {perms.create !== false && (
            <button onClick={openCreate} style={btn('primary')}>+ Cadastrar Cliente</button>
          )}
        </div>
      </div>

      {/* Search Bar */}
      <div style={{ position: 'relative', marginBottom: '20px' }}>
        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#555', pointerEvents: 'none', fontSize: '14px', lineHeight: 1 }}>🔍</span>
        <input
          style={{ ...inp, paddingLeft: '36px' }}
          placeholder="Buscar por nome, email, empresa..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Total de Clientes', value: clients.length, color: '#f0ece4', isCurrency: false },
          { label: 'Novos este Mês', value: thisMonth, color: '#f0ece4', isCurrency: false },
          { label: 'Com Dados de Contato', value: clientsWithData, color: '#f0ece4', isCurrency: false },
          { label: 'Valor Mensal Total', value: totalMonthly, color: '#e8c547', isCurrency: true },
        ].map(m => (
          <div key={m.label} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '16px 20px' }}>
            <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{m.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: m.color, lineHeight: 1 }}>
              {m.isCurrency ? fv(m.value as number) : m.value}
            </div>
            {m.isCurrency && <div style={{ fontSize: '11px', color: '#555', marginTop: '4px' }}>valor mensal</div>}
          </div>
        ))}
      </div>

      {/* Client List / Grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="👤"
          title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          subtitle={search ? 'Tente outro termo de busca.' : 'Cadastre seus clientes para vincular projetos e orçamentos.'}
          action={search ? undefined : '+ Cadastrar Cliente'}
          onAction={search ? undefined : openCreate}
        />
      ) : viewMode === 'grid' ? (
        // GRID VIEW
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '14px' }}>
          {filtered.map(c => {
            const ini = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            const ac = avatarColor(c.name)
            return (
              <div
                key={c.id}
                onClick={() => openView(c)}
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '20px', cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                {/* Avatar + tipo */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '15px', color: '#fff', flexShrink: 0 }}>{ini}</div>
                  <span style={{ fontSize: '11px', padding: '2px 8px', background: c.client_type === 'pessoa' ? 'rgba(91,155,213,.15)' : 'rgba(232,197,71,.1)', color: c.client_type === 'pessoa' ? '#5b9bd5' : '#e8c547', borderRadius: '20px', fontWeight: 600 }}>
                    {c.client_type === 'pessoa' ? '👤 Pessoa' : '🏢 Empresa'}
                  </span>
                </div>
                {/* Name */}
                <div style={{ fontWeight: 700, fontSize: '15px', color: '#f0ece4', marginTop: '12px', marginBottom: '2px' }}>{c.name}</div>
                {c.contact_name && <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>{c.contact_name}</div>}
                {!c.contact_name && <div style={{ marginBottom: '8px' }} />}
                {/* Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {c.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888' }}>
                      <span style={{ fontSize: '12px' }}>✉️</span>{c.email}
                    </div>
                  )}
                  {c.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888' }}>
                      <span style={{ fontSize: '12px' }}>📞</span>{c.phone}
                    </div>
                  )}
                  {c.segment && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#888' }}>
                      <span style={{ fontSize: '12px' }}>🏷️</span>{c.segment}
                    </div>
                  )}
                  {c.prospection_source && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#666' }}>
                      <span style={{ fontSize: '11px' }}>📡</span>{c.prospection_source}
                    </div>
                  )}
                  {(c.monthly_value || 0) > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#e8c547' }}>
                      <span style={{ fontSize: '12px' }}>💰</span>{fv(c.monthly_value!)}
                    </div>
                  )}
                </div>
                {/* Footer */}
                {(perms.edit !== false || perms.delete !== false) && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #2a2a2a', paddingTop: '12px', marginTop: '12px' }}>
                    {perms.edit !== false ? (
                      <button
                        onClick={e => { e.stopPropagation(); openEdit(c) }}
                        style={{ ...btn('ghost'), padding: '6px 10px', fontSize: '12px' }}
                      >✏️ Editar</button>
                    ) : <span />}
                    {perms.delete !== false && (
                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                        style={{ ...btn('danger'), padding: '6px 10px', fontSize: '12px' }}
                      >🗑</button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        // LIST VIEW
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {filtered.map(c => {
            const ini = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            const ac = avatarColor(c.name)
            return (
              <div
                key={c.id}
                onClick={() => openView(c)}
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: ac, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', color: '#fff', flexShrink: 0 }}>{ini}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#f0ece4' }}>{c.name}</div>
                  {c.email && <div style={{ fontSize: '12px', color: '#555', marginTop: '1px' }}>{c.email}</div>}
                </div>
                {c.segment && <div style={{ fontSize: '12px', color: '#555', flexShrink: 0 }}>{c.segment}</div>}
                <span style={{ color: '#555', fontSize: '16px', flexShrink: 0 }}>›</span>
              </div>
            )
          })}
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>

              {/* Tipo: Empresa ou Pessoa */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Tipo de Cliente</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['empresa', 'pessoa'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, client_type: t }))}
                      style={{
                        flex: 1, padding: '9px', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                        cursor: 'pointer', border: 'none',
                        background: form.client_type === t ? (t === 'empresa' ? 'rgba(232,197,71,.2)' : 'rgba(91,155,213,.2)') : '#1a1a1a',
                        color: form.client_type === t ? (t === 'empresa' ? '#e8c547' : '#5b9bd5') : '#555',
                        outline: form.client_type === t ? `1px solid ${t === 'empresa' ? '#e8c54755' : '#5b9bd555'}` : '1px solid #2a2a2a',
                      }}
                    >
                      {t === 'empresa' ? '🏢 Empresa' : '👤 Pessoa'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nome principal */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>
                  {form.client_type === 'empresa' ? 'Nome da Empresa *' : 'Nome Completo *'}
                </label>
                <input
                  type="text" style={inp}
                  value={form.name || ''}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder={form.client_type === 'empresa' ? 'Ex: Empresa XYZ Ltda' : 'Ex: João Silva'}
                />
              </div>

              {/* Contato na empresa (só quando tipo = empresa) */}
              {form.client_type === 'empresa' && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Pessoa de Contato</label>
                  <input
                    type="text" style={inp}
                    value={form.contact_name || ''}
                    onChange={e => setForm(p => ({ ...p, contact_name: e.target.value }))}
                    placeholder="Ex: Maria Souza (Diretora de Marketing)"
                  />
                </div>
              )}

              {/* Segmento */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Segmento</label>
                <input type="text" style={inp} value={form.segment || ''} onChange={e => setForm(p => ({ ...p, segment: e.target.value }))} placeholder="Saúde, Educação, Eventos..." />
              </div>

              {/* Contatos */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>WhatsApp</label>
                  <input type="text" style={inp} value={form.whatsapp || ''} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="(85) 9 0000-0000" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Telefone</label>
                  <input type="text" style={inp} value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(85) 0000-0000" />
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>E-mail</label>
                <input type="email" style={inp} value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="contato@empresa.com" />
              </div>

              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor mensal (contrato fixo)</label>
                <input type="number" style={inp} value={form.monthly_value || ''} onChange={e => setForm(p => ({ ...p, monthly_value: Number(e.target.value) }))} placeholder="0" />
              </div>

              {/* Forma de prospecção — select com opções do CompanySettings */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Forma de Prospecção</label>
                <select
                  style={inp}
                  value={form.prospection_source || ''}
                  onChange={e => setForm(p => ({ ...p, prospection_source: e.target.value }))}
                >
                  <option value="">Selecione...</option>
                  {captacoes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Observações */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Observações</label>
                <textarea
                  style={{ ...inp, minHeight: '64px', resize: 'vertical' as const }}
                  value={form.notes || ''}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Anotações internas sobre este cliente..."
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => setShowModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar cliente'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CLIENT DETAIL MODAL */}
      {viewClient && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1001, padding: '16px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflowY: 'auto' }}>

            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #1a1a1a', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: 0 }}>
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e8c54726', border: '2px solid #e8c54755', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '18px', color: '#e8c547', flexShrink: 0 }}>
                  {viewClient.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '20px', color: '#f0ece4', margin: 0 }}>{viewClient.name}</h2>
                    <span style={{ fontSize: '11px', padding: '2px 8px', background: viewClient.client_type === 'pessoa' ? 'rgba(91,155,213,.15)' : 'rgba(232,197,71,.1)', color: viewClient.client_type === 'pessoa' ? '#5b9bd5' : '#e8c547', borderRadius: '20px', fontWeight: 600 }}>
                      {viewClient.client_type === 'pessoa' ? '👤 Pessoa' : '🏢 Empresa'}
                    </span>
                  </div>
                  {viewClient.contact_name && (
                    <div style={{ marginTop: '4px', fontSize: '13px', color: '#888' }}>Contato: {viewClient.contact_name}</div>
                  )}
                  {viewClient.segment && (
                    <span style={{ marginTop: '4px', display: 'inline-block', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '4px', padding: '2px 8px', fontSize: '11px', color: '#888' }}>
                      {viewClient.segment}
                    </span>
                  )}
                </div>
              </div>
              <button onClick={() => setViewClient(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1, flexShrink: 0 }}>×</button>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

              {/* Stats row — 4 KPI cards */}
              {loadingProjects ? (
                <div style={{ color: '#555', fontSize: '13px', textAlign: 'center', padding: '16px 0' }}>Carregando projetos...</div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }} className="stats-grid">
                    {[
                      { label: 'PROJETOS', value: String(clientProjects.length), color: '#5b9bd5' },
                      { label: 'VALOR TOTAL', value: fv(totalValue), color: '#5db87a' },
                      { label: 'TICKET MÉDIO', value: fv(ticketMedio), color: '#e8c547' },
                      { label: 'CONTRATO FIXO', value: viewClient.monthly_value ? fv(viewClient.monthly_value) : 'Sem contrato', color: '#9b8fd5' },
                    ].map(k => (
                      <div key={k.label} style={{ background: '#0d0f12', border: `1px solid ${k.color}33`, borderRadius: '10px', padding: '14px 12px', textAlign: 'center' }}>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '15px', color: k.color, marginBottom: '4px', wordBreak: 'break-word' as const }}>{k.value}</div>
                        <div style={{ fontSize: '10px', color: '#555', letterSpacing: '0.8px', textTransform: 'uppercase' as const }}>{k.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Último projeto */}
                  {lastProject && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '10px' }}>Último Projeto</div>
                      <div style={{ background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' as const }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                          <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f0ece4' }}>{lastProject.name}</span>
                          <StatusBadge status={lastProject.status} />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                          {lastProject.value > 0 && <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '14px', color: '#5db87a' }}>{fv(lastProject.value)}</span>}
                          {lastProject.delivery_date && <span style={{ fontSize: '12px', color: '#555' }}>Entrega: {new Date(lastProject.delivery_date).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forma de prospecção */}
                  {(viewClient.prospection_source || viewClient.notes) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {viewClient.prospection_source && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Forma de Prospecção</div>
                          <div style={{ background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '12px 16px', fontSize: '13px', color: '#e8c547', fontWeight: 600 }}>
                            {viewClient.prospection_source}
                          </div>
                        </div>
                      )}
                      {viewClient.notes && (
                        <div>
                          <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '8px' }}>Observações</div>
                          <div style={{ background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#c0bcb4', lineHeight: '1.6' }}>
                            {viewClient.notes}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Contact info */}
                  {(viewClient.email || viewClient.phone || viewClient.whatsapp) && (
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const }}>
                      {viewClient.email && (
                        <a href={`mailto:${viewClient.email}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#c0bcb4', textDecoration: 'none' }}>
                          📧 {viewClient.email}
                        </a>
                      )}
                      {viewClient.phone && (
                        <a href={`tel:${viewClient.phone}`} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#c0bcb4', textDecoration: 'none' }}>
                          📞 {viewClient.phone}
                        </a>
                      )}
                      {viewClient.whatsapp && (
                        <a href={`https://wa.me/${viewClient.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', color: '#c0bcb4', textDecoration: 'none' }}>
                          💬 {viewClient.whatsapp}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Projects list */}
                  {clientProjects.length > 0 && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '10px' }}>Todos os Projetos ({clientProjects.length})</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {[...clientProjects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map(p => (
                          <div key={p.id} style={{ background: '#0d0f12', border: '1px solid #1a1a1a', borderRadius: '8px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' as const }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                              <span style={{ fontSize: '13px', color: '#c0bcb4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</span>
                              <StatusBadge status={p.status} />
                            </div>
                            {p.value > 0 && <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '13px', color: '#5db87a', flexShrink: 0 }}>{fv(p.value)}</span>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button onClick={() => setViewClient(null)} style={btn('ghost')}>Fechar</button>
              {perms.edit !== false && <button onClick={() => { setViewClient(null); openEdit(viewClient) }} style={btn('primary')}>✏️ Editar</button>}
            </div>
          </div>

          {/* Responsive stats grid style via style tag */}
          <style>{`
            @media (max-width: 540px) {
              .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
            }
          `}</style>
        </div>
      )}
    </div>
  )
}
