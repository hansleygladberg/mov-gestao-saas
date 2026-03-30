'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }

interface Client {
  id: string; name: string; segment?: string; phone?: string; email?: string
  whatsapp?: string; monthly_value?: number; notes?: string; created_at: string
}

interface Project {
  id: string; name: string; status: string; value: number; delivery_date?: string
  created_at: string; client_id?: string
  data?: { custos?: { v: number }[]; diarias?: { qtd: number; v: number }[] }
}

const BLANK = (): Partial<Client> => ({ name: '', segment: '', phone: '', email: '', whatsapp: '', monthly_value: 0, notes: '' })

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btn = (v: 'primary' | 'ghost' | 'danger') => ({ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: v === 'ghost' ? '1px solid #2a2a2a' : 'none', background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent', color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#888', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties)

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

  // View modal state
  const [viewClient, setViewClient] = useState<Client | null>(null)
  const [clientProjects, setClientProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(false)

  const load = useCallback(async () => { setLoading(true); const r = await fetch('/api/clients'); const d = await r.json(); setClients(Array.isArray(d) ? d : []); setLoading(false) }, [])
  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(BLANK()); setShowModal(true) }
  function openEdit(c: Client) {
    setEditing(c)
    setForm({ name: c.name, segment: c.segment || '', phone: c.phone || '', email: c.email || '', whatsapp: c.whatsapp || '', monthly_value: c.monthly_value || 0, notes: c.notes || '' })
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

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  // Detail modal computed stats
  const totalValue = clientProjects.reduce((s, p) => s + (p.value || 0), 0)
  const ticketMedio = clientProjects.length > 0 ? totalValue / clientProjects.length : 0
  const lastProject = clientProjects.length > 0
    ? [...clientProjects].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
    : null

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Clientes</h1>
          <p style={{ color: '#555', fontSize: '13px' }}>{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} style={btn('primary')}>+ Novo Cliente</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '20px' }}>
        <input style={{ ...inp, width: '100%', maxWidth: '320px' }} placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="👤"
          title={search ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
          subtitle={search ? 'Tente outro termo de busca.' : 'Cadastre seus clientes para vincular projetos e orçamentos.'}
          action={search ? undefined : '+ Novo Cliente'}
          onAction={search ? undefined : openCreate}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
          {filtered.map(c => {
            const ini = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            return (
              <div
                key={c.id}
                onClick={() => openView(c)}
                style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '18px', cursor: 'pointer', transition: 'border-color .15s' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#444')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#2a2a2a')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#e8c54722', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8c547', flexShrink: 0 }}>{ini}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f0ece4' }}>{c.name}</div>
                    {c.segment && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{c.segment}</div>}
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#555', lineHeight: '1.8' }}>
                  {c.whatsapp && <div>📱 {c.whatsapp}</div>}
                  {c.email && <div>✉️ {c.email}</div>}
                  {c.monthly_value ? <div style={{ color: '#e8924a' }}>💰 {fv(c.monthly_value)}/mês</div> : null}
                </div>
                <div style={{ display: 'flex', gap: '6px', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid #1a1a1a' }}>
                  <button
                    onClick={e => { e.stopPropagation(); openEdit(c) }}
                    style={{ ...btn('ghost'), flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '12px' }}
                  >✏️ Editar</button>
                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(c.id) }}
                    style={{ ...btn('danger'), padding: '6px 10px', fontSize: '12px' }}
                  >🗑</button>
                </div>
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
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Cliente' : 'Novo Cliente'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              {[
                { key: 'name', label: 'Nome / Empresa *', placeholder: 'Empresa XYZ', type: 'text' },
                { key: 'segment', label: 'Segmento', placeholder: 'Saúde, Educação...', type: 'text' },
                { key: 'whatsapp', label: 'WhatsApp', placeholder: '(85) 9 0000-0000', type: 'text' },
                { key: 'phone', label: 'Telefone', placeholder: '(85) 0000-0000', type: 'text' },
                { key: 'email', label: 'E-mail', placeholder: 'contato@empresa.com', type: 'email' },
                { key: 'monthly_value', label: 'Valor mensal (contrato fixo)', placeholder: '0', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>{f.label}</label>
                  <input type={f.type} style={inp} value={(form as Record<string, unknown>)[f.key] as string || ''} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
              {/* Notes / Forma de prospecção */}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Forma de Prospecção</label>
                <textarea
                  style={{ ...inp, minHeight: '72px', resize: 'vertical' as const }}
                  value={form.notes || ''}
                  onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Como este cliente foi prospectado..."
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
                <div style={{ width: '52px', height: '52px', borderRadius: '50%', background: '#e8c54726', border: '2px solid #e8c54755', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '18px', color: '#e8c547', flexShrink: 0 }}>
                  {viewClient.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: '#f0ece4', margin: 0 }}>{viewClient.name}</h2>
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
                        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: k.color, marginBottom: '4px', wordBreak: 'break-word' as const }}>{k.value}</div>
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
                          <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f0ece4' }}>{lastProject.name}</span>
                          <StatusBadge status={lastProject.status} />
                        </div>
                        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
                          {lastProject.value > 0 && <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px', color: '#5db87a' }}>{fv(lastProject.value)}</span>}
                          {lastProject.delivery_date && <span style={{ fontSize: '12px', color: '#555' }}>Entrega: {new Date(lastProject.delivery_date).toLocaleDateString('pt-BR')}</span>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Forma de prospecção */}
                  {viewClient.notes && (
                    <div>
                      <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '10px' }}>Forma de Prospecção</div>
                      <div style={{ background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px', fontSize: '13px', color: '#c0bcb4', lineHeight: '1.6' }}>
                        {viewClient.notes}
                      </div>
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
                            {p.value > 0 && <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '13px', color: '#5db87a', flexShrink: 0 }}>{fv(p.value)}</span>}
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
              <button onClick={() => { setViewClient(null); openEdit(viewClient) }} style={btn('primary')}>✏️ Editar</button>
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
