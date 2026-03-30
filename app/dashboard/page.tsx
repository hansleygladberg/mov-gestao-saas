'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }
function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }

const ST: Record<string, { label: string; color: string }> = {
  orcamento: { label: 'ORÇAMENTO', color: '#5b9bd5' },
  producao: { label: 'EM PRODUÇÃO', color: '#e8c547' },
  edicao: { label: 'EDIÇÃO', color: '#e8924a' },
  entregue: { label: 'ENTREGUE', color: '#5db87a' },
  pausado: { label: 'PAUSADO', color: '#6b7280' },
  orcamento_desaprovado: { label: 'REPROVADO', color: '#e85d4a' },
}

interface Project {
  id: string; name: string; type?: string; status: string; value: number
  delivery_date?: string; progress: number; client_id?: string
  data?: { custos?: { v: number }[]; pgtos?: { v: number; rec: boolean }[]; diarias?: { desc: string; qtd: number }[]; freeIds?: string[] }
  clients?: { name: string } | null
}
interface Event { id: string; title: string; event_date: string; event_type: string }
interface Transaction { type: string; value: number; transaction_date?: string }

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [companyName, setCompanyName] = useState('')
  const router = useRouter()

  const TYPE_LABEL: Record<string, string> = { capt: 'Captação', entrega: 'Entrega', fixo: 'Fixo', manual: 'Evento' }
  const TYPE_COLOR: Record<string, string> = { capt: '#e8c547', entrega: '#5db87a', fixo: '#5b9bd5', manual: '#e8924a' }

  useEffect(() => {
    async function load() {
      try {
        const [projRes, evRes, txRes, meRes] = await Promise.all([
          fetch('/api/projects').then(r => r.json()).catch(() => null),
          fetch('/api/events').then(r => r.json()).catch(() => []),
          fetch('/api/transactions').then(r => r.json()).catch(() => []),
          fetch('/api/me').then(r => r.ok ? r.json() : null).catch(() => null),
        ])
        if (!Array.isArray(projRes)) { router.push('/login'); return }
        setProjects(projRes)
        setEvents(Array.isArray(evRes) ? evRes : [])
        setTransactions(Array.isArray(txRes) ? txRes : [])
        if (meRes) setCompanyName(meRes.company?.name || '')
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  async function deleteProject(id: string) {
    if (!confirm('Excluir este projeto?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    setProjects(p => p.filter(x => x.id !== id))
  }

  async function approveProject(id: string) {
    await fetch(`/api/projects/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'para_captacao' }),
    })
    setProjects(p => p.map(x => x.id === id ? { ...x, status: 'para_captacao' } : x))
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f12' }}>
      <div style={{ color: '#555', fontSize: '13px' }}>Carregando...</div>
    </div>
  )

  // KPIs
  const activeProjects = projects.filter(p => !['entregue', 'orcamento', 'orcamento_desaprovado', 'pausado'].includes(p.status))
  const pendingProjects = projects.filter(p => p.status !== 'entregue')
  const quoteProjects = projects.filter(p => p.status === 'orcamento')

  const today = new Date().toISOString().split('T')[0]
  const in7 = new Date(); in7.setDate(in7.getDate() + 7); const in7str = in7.toISOString().split('T')[0]
  const urgentProjects = projects.filter(p => p.delivery_date && p.delivery_date >= today && p.delivery_date <= in7str && p.status !== 'entregue')

  const totalReceived = transactions.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.value), 0)
  const totalPending = transactions.filter(t => t.type === 'arec').reduce((s, t) => s + Number(t.value), 0)
  const totalExpenses = transactions.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
  const margem = totalReceived > 0 ? Math.round(((totalReceived - totalExpenses) / totalReceived) * 100) : 0

  const upcomingEvents = events.filter(e => e.event_date >= today).slice(0, 5)
  const recentProjects = [...projects].sort((a, b) => 0).slice(0, 6)

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh' }}>
      {/* Alert bar */}
      {urgentProjects.length > 0 && (
        <div style={{ background: 'rgba(232,197,71,.12)', borderBottom: '1px solid rgba(232,197,71,.2)', padding: '10px 28px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '13px' }}>⚠️</span>
          <span style={{ fontSize: '13px', color: '#e8c547' }}>
            {urgentProjects.length} projeto{urgentProjects.length > 1 ? 's' : ''} com entrega nos próximos 7 dias
          </span>
          <Link href="/dashboard/projects" style={{ fontSize: '12px', color: '#e8c547', border: '1px solid rgba(232,197,71,.4)', borderRadius: '6px', padding: '2px 10px', textDecoration: 'none', fontWeight: 600 }}>Ver</Link>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Dashboard</h1>
          <p style={{ color: '#4b5563', fontSize: '13px' }}>{companyName}</p>
        </div>
      </div>

      <div style={{ padding: '20px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
          {[
            { label: 'PROJETOS ATIVOS', value: activeProjects.length.toString(), sub: `${projects.filter(p => p.status === 'entregue').length} entregues`, color: '#e8c547' },
            { label: 'PROJETOS PENDENTES', value: pendingProjects.length.toString(), sub: `${quoteProjects.length} orçamento${quoteProjects.length !== 1 ? 's' : ''} aberto${quoteProjects.length !== 1 ? 's' : ''}`, color: '#5b9bd5' },
            { label: 'A RECEBER', value: fv(totalPending), sub: 'pendente', color: '#e8924a' },
            { label: 'MARGEM', value: `${margem}%`, sub: 'após despesas', color: margem >= 30 ? '#5db87a' : '#e85d4a' },
          ].map(k => (
            <div key={k.label} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '18px 20px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '10px' }}>{k.label}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '28px', fontWeight: 700, color: k.color, lineHeight: 1 }}>{k.value}</div>
              <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '4px' }}>{k.sub}</div>
            </div>
          ))}
        </div>

        {/* Orçamentos aguardando aprovação */}
        {quoteProjects.length > 0 && (
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 600, color: '#f0ece4', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>📋</span> Orçamentos aguardando aprovação
                <span style={{ background: '#5b9bd5', color: '#000', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px' }}>{quoteProjects.length}</span>
              </h3>
              <a href="/dashboard/projects" style={{ fontSize: '12px', color: '#e8c547', textDecoration: 'none' }}>Ver todos →</a>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {quoteProjects.slice(0, 5).map(p => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', background: '#0d0f12', borderRadius: '8px', border: '1px solid #1f2229' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>{p.clients?.name || '—'} · {fv(p.value)}</div>
                  </div>
                  <button
                    onClick={() => approveProject(p.id)}
                    style={{ padding: '5px 14px', background: 'rgba(93,184,122,.15)', border: '1px solid rgba(93,184,122,.3)', borderRadius: '6px', color: '#5db87a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                    ✓ Aprovar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Próximos eventos */}
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 600, color: '#f0ece4', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📅</span> Próximos eventos
            </h3>
            <Link href="/dashboard/events" style={{ fontSize: '12px', color: '#e8c547', textDecoration: 'none' }}>Ver calendário →</Link>
          </div>
          {upcomingEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '13px' }}>Nenhum evento previsto.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {upcomingEvents.map(ev => (
                <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 0', borderBottom: '1px solid #1f2229' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: TYPE_COLOR[ev.event_type] || '#555', flexShrink: 0 }} />
                  <span style={{ fontSize: '13px', color: '#d1d5db', flex: 1 }}>{ev.title}</span>
                  <span style={{ fontSize: '11px', color: '#4b5563' }}>{fd(ev.event_date)}</span>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: (TYPE_COLOR[ev.event_type] || '#555') + '22', color: TYPE_COLOR[ev.event_type] || '#555', fontWeight: 600 }}>{TYPE_LABEL[ev.event_type] || ev.event_type}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Projetos recentes */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4' }}>Projetos recentes</h3>
            <Link href="/dashboard/projects" style={{ fontSize: '12px', color: '#e8c547', textDecoration: 'none' }}>Ver todos →</Link>
          </div>

          {recentProjects.length === 0 ? (
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>Nenhum projeto ainda.</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '12px' }}>
              {recentProjects.map(p => {
                const st = ST[p.status] || { label: p.status, color: '#555' }
                const totalPgto = (p.data?.pgtos || []).reduce((s, pg) => s + pg.v, 0)
                const recebido = (p.data?.pgtos || []).filter(pg => pg.rec).reduce((s, pg) => s + pg.v, 0)
                const pendente = totalPgto - recebido
                const diarias = p.data?.diarias || []
                const captacoes = diarias.reduce((s, d) => s + d.qtd, 0)

                return (
                  <div key={p.id} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', overflow: 'hidden' }}>
                    {/* Status color bar */}
                    <div style={{ height: '3px', background: st.color }} />
                    <div style={{ padding: '16px' }}>
                      {/* Title + status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
                        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#f0ece4', lineHeight: 1.3, flex: 1 }}>{p.name}</div>
                        <span style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '6px', background: st.color + '22', color: st.color, whiteSpace: 'nowrap', flexShrink: 0 }}>{st.label}</span>
                      </div>

                      {/* Meta */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
                        {p.clients?.name && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
                            <span>👤</span><span>{p.clients.name}</span>
                          </div>
                        )}
                        {p.delivery_date && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#6b7280' }}>
                            <span>📅</span><span>{fd(p.delivery_date)}</span>
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                          {p.type && (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#1a1d24', color: '#9ca3af', border: '1px solid #2a2d35' }}>{p.type}</span>
                          )}
                          {captacoes > 0 && (
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', background: '#1a1d24', color: '#9ca3af', border: '1px solid #2a2d35' }}>🎬 {captacoes} captaç{captacoes !== 1 ? 'ões' : 'ão'}</span>
                          )}
                        </div>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: '12px' }}>
                        <div style={{ height: '4px', background: '#1f2229', borderRadius: '2px', overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${p.progress || 0}%`, background: st.color, borderRadius: '2px', transition: 'width .3s' }} />
                        </div>
                      </div>

                      {/* Value row */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4' }}>{fv(p.value)}</span>
                        {pendente > 0 && (
                          <span style={{ fontSize: '12px', color: '#e8924a', fontWeight: 600 }}>R$ {pendente.toLocaleString('pt-BR')} pendente</span>
                        )}
                        {pendente === 0 && p.progress === 100 && (
                          <span style={{ fontSize: '11px', color: '#5db87a', fontWeight: 600 }}>✓ Pago</span>
                        )}
                      </div>

                      {/* Buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <Link href={`/dashboard/projects`} style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '8px', color: '#9ca3af', fontSize: '12px', fontWeight: 500, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          ✏️ Editar
                        </Link>
                        <Link href="/dashboard/quotes" style={{ flex: 1, padding: '7px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '8px', color: '#9ca3af', fontSize: '12px', fontWeight: 500, textDecoration: 'none', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                          📄 Orçamento
                        </Link>
                        <button onClick={() => deleteProject(p.id)} style={{ padding: '7px 10px', background: 'rgba(232,93,74,.08)', border: '1px solid rgba(232,93,74,.2)', borderRadius: '8px', color: '#e85d4a', fontSize: '12px', cursor: 'pointer' }}>
                          🗑️
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
