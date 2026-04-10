'use client'

import { useState, useEffect, useCallback } from 'react'

function fd(d: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

interface TrashedProject {
  id: string
  name: string
  status: string
  value: number
  deleted_at: string
  clients: { name: string } | null
}

interface TrashedClient {
  id: string
  name: string
  email?: string
  whatsapp?: string
  deleted_at: string
}

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Orçamento', producao: 'Produção', edicao: 'Edição',
  finalizado: 'Finalizado', aprovado: 'Aprovado', orcamento_desaprovado: 'Reprovado',
}

export default function TrashPage() {
  const [projects, setProjects] = useState<TrashedProject[]>([])
  const [clients, setClients] = useState<TrashedClient[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'projetos' | 'clientes'>('projetos')
  const [toast, setToast] = useState('')
  const [actionId, setActionId] = useState<string | null>(null)

  function showMsg(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/trash')
    if (res.ok) {
      const d = await res.json()
      setProjects(d.projects || [])
      setClients(d.clients || [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function restore(type: 'project' | 'client', id: string) {
    setActionId(id)
    await fetch('/api/trash', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id }) })
    showMsg('Item restaurado!')
    await load()
    setActionId(null)
  }

  async function deletePermanent(type: 'project' | 'client', id: string, name: string) {
    if (!confirm(`Excluir "${name}" permanentemente? Esta ação não pode ser desfeita.`)) return
    setActionId(id)
    await fetch('/api/trash', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type, id }) })
    showMsg('Excluído permanentemente.')
    await load()
    setActionId(null)
  }

  const total = projects.length + clients.length

  const card: React.CSSProperties = { background: '#111318', border: '1px solid #1f2229', borderRadius: '10px' }
  const tabBtn = (active: boolean): React.CSSProperties => ({
    background: 'none', border: 'none', cursor: 'pointer',
    borderBottom: active ? '2px solid #e8c547' : '2px solid transparent',
    color: active ? '#e8c547' : '#555',
    fontSize: '13px', fontWeight: active ? 600 : 400,
    padding: '10px 20px', marginBottom: '-1px',
    fontFamily: "'Montserrat', sans-serif",
  })

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 18px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>🗑 Lixeira</h1>
        <p style={{ color: '#4b5563', fontSize: '13px' }}>
          {total > 0 ? `${total} item${total > 1 ? 's' : ''} excluído${total > 1 ? 's' : ''}` : 'Nenhum item excluído'}
          {total > 0 ? ' · Restaure ou exclua permanentemente' : ''}
        </p>
      </div>

      {loading ? (
        <div style={{ ...card, padding: '60px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Carregando...</div>
      ) : total === 0 ? (
        <div style={{ ...card, padding: '60px', textAlign: 'center' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
          <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '6px' }}>Lixeira vazia</div>
          <div style={{ fontSize: '13px', color: '#4b5563' }}>Projetos e clientes excluídos aparecem aqui</div>
        </div>
      ) : (
        <div style={card}>
          {/* Tabs */}
          <div style={{ display: 'flex', borderBottom: '1px solid #1f2229', padding: '0 4px' }}>
            <button style={tabBtn(activeTab === 'projetos')} onClick={() => setActiveTab('projetos')}>
              🎬 Projetos {projects.length > 0 && <span style={{ marginLeft: '4px', background: 'rgba(232,197,71,.15)', color: '#e8c547', fontSize: '11px', padding: '1px 6px', borderRadius: '10px' }}>{projects.length}</span>}
            </button>
            <button style={tabBtn(activeTab === 'clientes')} onClick={() => setActiveTab('clientes')}>
              👥 Clientes {clients.length > 0 && <span style={{ marginLeft: '4px', background: 'rgba(232,197,71,.15)', color: '#e8c547', fontSize: '11px', padding: '1px 6px', borderRadius: '10px' }}>{clients.length}</span>}
            </button>
          </div>

          {/* Projetos */}
          {activeTab === 'projetos' && (
            <div>
              {projects.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Nenhum projeto excluído</div>
              ) : projects.map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #1a1d24', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '3px' }}>{p.name}</div>
                    <div style={{ fontSize: '12px', color: '#4b5563', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {p.clients?.name && <span>👤 {p.clients.name}</span>}
                      <span style={{ background: '#1a1d24', padding: '1px 7px', borderRadius: '4px' }}>{STATUS_LABEL[p.status] || p.status}</span>
                    </div>
                  </div>
                  <div style={{ fontSize: '13px', color: '#e8c547', fontWeight: 600, minWidth: '90px' }}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(p.value)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563', minWidth: '100px' }}>
                    Excluído em {fd(p.deleted_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => restore('project', p.id)}
                      disabled={actionId === p.id}
                      style={{ padding: '6px 14px', background: 'rgba(93,184,122,.12)', border: '1px solid rgba(93,184,122,.25)', borderRadius: '7px', color: '#5db87a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                    >
                      ↩ Restaurar
                    </button>
                    <button
                      onClick={() => deletePermanent('project', p.id, p.name)}
                      disabled={actionId === p.id}
                      style={{ padding: '6px 14px', background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.2)', borderRadius: '7px', color: '#e85d4a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                    >
                      🗑 Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Clientes */}
          {activeTab === 'clientes' && (
            <div>
              {clients.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Nenhum cliente excluído</div>
              ) : clients.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '14px 20px', borderBottom: '1px solid #1a1d24', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '3px' }}>{c.name}</div>
                    <div style={{ fontSize: '12px', color: '#4b5563', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {c.email && <span>✉️ {c.email}</span>}
                      {c.whatsapp && <span>📱 {c.whatsapp}</span>}
                    </div>
                  </div>
                  <div style={{ fontSize: '12px', color: '#4b5563', minWidth: '100px' }}>
                    Excluído em {fd(c.deleted_at)}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => restore('client', c.id)}
                      disabled={actionId === c.id}
                      style={{ padding: '6px 14px', background: 'rgba(93,184,122,.12)', border: '1px solid rgba(93,184,122,.25)', borderRadius: '7px', color: '#5db87a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                    >
                      ↩ Restaurar
                    </button>
                    <button
                      onClick={() => deletePermanent('client', c.id, c.name)}
                      disabled={actionId === c.id}
                      style={{ padding: '6px 14px', background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.2)', borderRadius: '7px', color: '#e85d4a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                    >
                      🗑 Excluir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '16px', fontSize: '12px', color: '#3a3a3a', textAlign: 'center' }}>
        Itens na lixeira não são recuperados automaticamente. Execute a migration 016 no Supabase se a lixeira não funcionar.
      </div>
    </div>
  )
}
