'use client'

import { useState, useEffect, useCallback } from 'react'

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
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState('')

  // New client mini-modal
  const [showClientModal, setShowClientModal] = useState(false)
  const [clientForm, setClientForm] = useState({ name: '', email: '', whatsapp: '' })
  const [savingClient, setSavingClient] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3500) }

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
    navigator.clipboard.writeText(url).then(() => showToast('🔗 Link copiado!')).catch(() => showToast(url))
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este orçamento?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await load()
  }

  async function saveNewClient() {
    if (!clientForm.name.trim()) { showToast('Informe o nome'); return }
    setSavingClient(true)
    try {
      const r = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(clientForm) })
      if (!r.ok) throw new Error((await r.json()).error)
      const newClient = await r.json()
      setClients(prev => [...prev, newClient])
      setShowClientModal(false)
      setClientForm({ name: '', email: '', whatsapp: '' })
      showToast('✅ Cliente criado!')
    } catch (e: unknown) { showToast('Erro: ' + (e instanceof Error ? e.message : 'Erro')) }
    finally { setSavingClient(false) }
  }

  if (loading) return <div style={{ padding: '40px', color: '#555', textAlign: 'center', background: '#0d0f12', minHeight: '100vh' }}>Carregando...</div>

  const pending = projects.filter(p => p.status === 'orcamento')
  const rejected = projects.filter(p => p.status === 'orcamento_desaprovado')
  const totalPending = pending.reduce((s, p) => s + p.value, 0)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '12px 20px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Orçamentos</h1>
          <p style={{ color: '#4b5563', fontSize: '13px' }}>{pending.length} aguardando aprovação · {fv(totalPending)} em aberto</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => setShowClientModal(true)} style={btnS('ghost')}>+ Novo Cliente</button>
          <a href="/dashboard/projects" style={{ ...btnS('primary'), textDecoration: 'none' }}>+ Novo Orçamento</a>
        </div>
      </div>

      {/* Clientes disponíveis */}
      {clients.length > 0 && (
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '11px', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginRight: '4px' }}>Clientes:</span>
          {clients.slice(0, 8).map(c => (
            <span key={c.id} style={{ fontSize: '12px', padding: '3px 10px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '20px', color: '#9ca3af' }}>{c.name}</span>
          ))}
          {clients.length > 8 && <span style={{ fontSize: '12px', color: '#4b5563' }}>+{clients.length - 8} mais</span>}
        </div>
      )}

      {projects.length === 0 ? (
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>📄</div>
          <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '6px' }}>Nenhum orçamento em aberto</div>
          <div style={{ fontSize: '13px', color: '#4b5563', marginBottom: '20px' }}>Crie um projeto com status "Orçamento" para que ele apareça aqui</div>
          <a href="/dashboard/projects" style={{ ...btnS('primary'), textDecoration: 'none' }}>+ Criar orçamento</a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {pending.length > 0 && (
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Aguardando aprovação</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {pending.map(p => <QuoteCard key={p.id} project={p} onDelete={handleDelete} onCopyLink={copyLink} />)}
              </div>
            </div>
          )}
          {rejected.length > 0 && (
            <div>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '13px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '12px' }}>Reprovados</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {rejected.map(p => <QuoteCard key={p.id} project={p} onDelete={handleDelete} onCopyLink={copyLink} />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mini-modal novo cliente */}
      {showClientModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>Novo Cliente</h3>
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

function QuoteCard({ project: p, onDelete, onCopyLink }: { project: Project; onDelete: (id: string) => void; onCopyLink: (token: string) => void }) {
  const isRejected = p.status === 'orcamento_desaprovado'
  return (
    <div style={{ background: '#111318', border: `1px solid ${isRejected ? 'rgba(232,93,74,.15)' : '#1f2229'}`, borderRadius: '10px', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRejected ? '#e85d4a' : '#5b9bd5', flexShrink: 0, marginTop: '5px' }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '15px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>{p.name}</div>
          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px' }}>
            {p.clients?.name && <span>👤 {p.clients.name} · </span>}
            {p.type && <span>{p.type} · </span>}
            {p.delivery_date && <span>📅 {fd(p.delivery_date)}</span>}
          </div>
          {p.description && <p style={{ fontSize: '12px', color: '#4b5563', marginBottom: '12px', lineHeight: 1.5 }}>{p.description}</p>}

          {/* Link de aprovação */}
          {p.quote_token && !isRejected && (
            <div style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 14px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '10px', color: '#4b5563', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '2px' }}>Link de aprovação</div>
                <div style={{ fontSize: '11px', color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {typeof window !== 'undefined' ? `${window.location.origin}/orcamento/${p.quote_token}` : `/orcamento/${p.quote_token}`}
                </div>
              </div>
              <button onClick={() => onCopyLink(p.quote_token!)} style={{ padding: '6px 12px', background: 'rgba(232,197,71,.1)', border: '1px solid rgba(232,197,71,.2)', borderRadius: '6px', color: '#e8c547', fontSize: '11px', fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
                🔗 Copiar
              </button>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 800, color: '#f0ece4' }}>{fv(p.value)}</span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 700, padding: '4px 10px', borderRadius: '6px', background: isRejected ? 'rgba(232,93,74,.12)' : 'rgba(91,155,213,.12)', color: isRejected ? '#e85d4a' : '#5b9bd5' }}>
                {isRejected ? 'REPROVADO' : 'AGUARDANDO'}
              </span>
              <button onClick={() => onDelete(p.id)} style={{ padding: '4px 10px', background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.15)', borderRadius: '6px', color: '#e85d4a', fontSize: '12px', cursor: 'pointer' }}>🗑</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
