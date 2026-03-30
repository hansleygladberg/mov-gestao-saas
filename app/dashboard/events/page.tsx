'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const DAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

interface Event {
  id: string
  title: string
  event_date: string
  event_time?: string
  event_type: 'capt' | 'entrega' | 'fixo' | 'manual'
  notes?: string
  created_at: string
}

const TYPE_LABEL: Record<string, string> = { capt: 'Captação', entrega: 'Entrega', fixo: 'Fixo', manual: 'Evento' }
const TYPE_COLOR: Record<string, string> = { capt: '#e8c547', entrega: '#5db87a', fixo: '#5b9bd5', manual: '#e8924a' }

const BLANK = (): Partial<Event> => ({
  title: '', event_type: 'manual', notes: '',
  event_date: new Date().toISOString().split('T')[0],
  event_time: '',
})

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#1a1d24',
  border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}
const btnS = (v: 'primary' | 'ghost' | 'danger') => ({
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer',
  border: v === 'ghost' ? '1px solid #2a2d35' : 'none',
  background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent',
  color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#6b7280',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
} as React.CSSProperties)

function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }
function ft(t?: string) { if (!t) return ''; return t.slice(0, 5) }

export default function EventsPage() {
  const toast = useToast()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Event | null>(null)
  const [form, setForm] = useState<Partial<Event>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [view, setView] = useState<'calendar' | 'list'>('calendar')

  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth())

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/events')
    const d = await r.json()
    setEvents(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate(date?: string) {
    setEditing(null)
    setForm({ ...BLANK(), event_date: date || BLANK().event_date })
    setShowModal(true)
  }

  function openEdit(e: Event) {
    setEditing(e)
    setForm({ title: e.title, event_type: e.event_type, notes: e.notes || '', event_date: e.event_date, event_time: e.event_time || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.title?.trim()) { toast.show('Informe o título', 'error'); return }
    if (!form.event_date) { toast.show('Informe a data', 'error'); return }
    setSaving(true)
    try {
      const payload = { ...form, event_time: form.event_time || null }
      const url = editing ? `/api/events/${editing.id}` : '/api/events'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load(); setShowModal(false)
      toast.show(editing ? 'Evento atualizado!' : 'Evento criado!', 'success')
    } catch (e: unknown) { toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error') }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este evento?')) return
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    await load(); toast.show('Evento excluído', 'success')
    setShowModal(false)
  }

  function getDaysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
  function getFirstDayOfWeek(y: number, m: number) { return new Date(y, m, 1).getDay() }

  const daysInMonth = getDaysInMonth(calYear, calMonth)
  const firstDay = getFirstDayOfWeek(calYear, calMonth)

  function eventsOnDate(day: number) {
    const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return events.filter(e => e.event_date === dateStr).sort((a, b) => (a.event_time || '').localeCompare(b.event_time || ''))
  }

  function prevMonth() { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1) } else setCalMonth(m => m - 1) }
  function nextMonth() { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1) } else setCalMonth(m => m + 1) }

  const todayStr = now.toISOString().split('T')[0]
  const upcoming = events.filter(e => e.event_date >= todayStr).sort((a, b) => {
    const d = a.event_date.localeCompare(b.event_date)
    if (d !== 0) return d
    return (a.event_time || '').localeCompare(b.event_time || '')
  }).slice(0, 10)

  const monthStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}`
  const monthEvents = events.filter(e => e.event_date.startsWith(monthStr)).sort((a, b) => {
    const d = a.event_date.localeCompare(b.event_date)
    if (d !== 0) return d
    return (a.event_time || '').localeCompare(b.event_time || '')
  })

  const todayDay = now.getDate()

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center', background: '#0d0f12', minHeight: '100vh' }}>Carregando...</div>

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Agenda</h1>
          <p style={{ color: '#4b5563', fontSize: '13px' }}>{events.length} evento{events.length !== 1 ? 's' : ''} cadastrado{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <div style={{ display: 'flex', background: '#1a1d24', borderRadius: '8px', padding: '3px', gap: '2px' }}>
            {(['calendar', 'list'] as const).map(v => (
              <button key={v} onClick={() => setView(v)} style={{ padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: view === v ? '#2a2d35' : 'transparent', color: view === v ? '#f0ece4' : '#4b5563', transition: 'all .12s' }}>
                {v === 'calendar' ? '📅 Calendário' : '☰ Lista'}
              </button>
            ))}
          </div>
          <button onClick={() => openCreate()} style={btnS('primary')}>+ Novo Evento</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: view === 'calendar' ? '1fr 280px' : '1fr', gap: '16px' }}>
        <div>
          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <button onClick={prevMonth} style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', padding: '6px 12px', fontSize: '14px' }}>←</button>
            <span style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4', minWidth: '180px', textAlign: 'center' }}>{MONTHS[calMonth]} {calYear}</span>
            <button onClick={nextMonth} style={{ background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '8px', color: '#9ca3af', cursor: 'pointer', padding: '6px 12px', fontSize: '14px' }}>→</button>
            <button onClick={() => { setCalMonth(now.getMonth()); setCalYear(now.getFullYear()) }} style={{ background: 'rgba(232,197,71,.1)', border: 'none', borderRadius: '8px', color: '#e8c547', cursor: 'pointer', padding: '6px 12px', fontSize: '12px', fontWeight: 500 }}>Hoje</button>
          </div>

          {view === 'calendar' ? (
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid #1f2229' }}>
                {DAYS_SHORT.map(d => (
                  <div key={d} style={{ padding: '10px 0', textAlign: 'center', fontSize: '11px', color: '#4b5563', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>{d}</div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {Array.from({ length: firstDay }).map((_, i) => (
                  <div key={`e${i}`} style={{ minHeight: '90px', borderRight: '1px solid #1f2229', borderBottom: '1px solid #1f2229', background: '#0d0f12' }} />
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1
                  const isToday = day === todayDay && calMonth === now.getMonth() && calYear === now.getFullYear()
                  const dayEvents = eventsOnDate(day)
                  const dateStr = `${calYear}-${String(calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  const col = (firstDay + i) % 7
                  return (
                    <div key={day} onClick={() => openCreate(dateStr)}
                      style={{ minHeight: '90px', borderRight: col < 6 ? '1px solid #1f2229' : 'none', borderBottom: '1px solid #1f2229', padding: '8px', cursor: 'pointer', background: 'transparent', transition: 'background .1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = '#141720')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div style={{ width: '24px', height: '24px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: isToday ? 700 : 400, background: isToday ? '#e8c547' : 'transparent', color: isToday ? '#000' : '#6b7280', marginBottom: '4px' }}>{day}</div>
                      {dayEvents.length > 0 && (() => {
                        const uniqueTypes = [...new Set(dayEvents.map(e => e.event_type))].slice(0, 3)
                        const hasMore = [...new Set(dayEvents.map(e => e.event_type))].length > 3
                        const tooltip = dayEvents.map(e => `${e.event_time ? ft(e.event_time) + ' ' : ''}${e.title}`).join('\n')
                        return (
                          <div title={tooltip} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, marginBottom: 4 }}>
                            {uniqueTypes.map(tp => (
                              <div key={tp} style={{ width: 5, height: 5, borderRadius: '50%', background: TYPE_COLOR[tp], flexShrink: 0 }} />
                            ))}
                            {hasMore && <span style={{ fontSize: 9, color: '#555', lineHeight: 1 }}>+</span>}
                          </div>
                        )
                      })()}
                      {dayEvents.slice(0, 3).map(ev => (
                        <div key={ev.id} onClick={e => { e.stopPropagation(); openEdit(ev) }}
                          title={ev.title}
                          style={{ fontSize: '10px', fontWeight: 500, padding: '2px 5px', borderRadius: '4px', marginBottom: '2px', background: TYPE_COLOR[ev.event_type] + '22', color: TYPE_COLOR[ev.event_type], overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%', cursor: 'pointer' }}>
                          {ev.event_time ? `${ft(ev.event_time)} ` : ''}{ev.title}
                        </div>
                      ))}
                      {dayEvents.length > 3 && <div style={{ fontSize: '10px', color: '#4b5563' }}>+{dayEvents.length - 3} mais</div>}
                    </div>
                  )
                })}
              </div>
            {monthEvents.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px 0 0', color: '#555', fontSize: 12 }}>
                Nenhum evento em {MONTHS[calMonth]} — clique em um dia para adicionar
              </div>
            )}
            </div>
          ) : (
            <div>
              {monthEvents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 20px', color: '#4b5563' }}>
                  <div style={{ fontSize: '36px', marginBottom: '12px' }}>📅</div>
                  <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '6px' }}>Nenhum evento em {MONTHS[calMonth]}</div>
                </div>
              ) : (
                <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', overflow: 'hidden' }}>
                  {monthEvents.map((ev, i) => (
                    <div key={ev.id} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px', borderBottom: i < monthEvents.length - 1 ? '1px solid #1f2229' : 'none' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '8px', flexShrink: 0, background: TYPE_COLOR[ev.event_type] + '22', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: TYPE_COLOR[ev.event_type], lineHeight: 1 }}>{ev.event_date.split('-')[2]}</div>
                        <div style={{ fontSize: '9px', color: TYPE_COLOR[ev.event_type], textTransform: 'uppercase' }}>{MONTHS[parseInt(ev.event_date.split('-')[1]) - 1]?.slice(0, 3)}</div>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{ev.title}</div>
                        <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                          {ev.event_time && <span>🕐 {ft(ev.event_time)}</span>}
                          <span style={{ padding: '1px 6px', borderRadius: '10px', background: TYPE_COLOR[ev.event_type] + '22', color: TYPE_COLOR[ev.event_type], fontWeight: 600, fontSize: '10px' }}>{TYPE_LABEL[ev.event_type]}</span>
                          {ev.notes && <span>{ev.notes}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={() => openEdit(ev)} style={{ ...btnS('ghost'), padding: '4px 10px', fontSize: '11px' }}>✏️</button>
                        <button onClick={() => handleDelete(ev.id)} style={{ ...btnS('danger'), padding: '4px 10px', fontSize: '11px' }}>🗑</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        {view === 'calendar' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '12px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Tipos</h3>
              {Object.entries(TYPE_LABEL).map(([key, label]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: TYPE_COLOR[key] }} />
                  <span style={{ fontSize: '12px', color: '#6b7280' }}>{label}</span>
                </div>
              ))}
            </div>
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '12px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Próximos eventos</h3>
              {upcoming.length === 0 ? (
                <div style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', padding: '16px 0' }}>Nenhum evento próximo</div>
              ) : (
                upcoming.map(ev => (
                  <div key={ev.id} onClick={() => openEdit(ev)} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#1a1d24')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <div style={{ width: '3px', height: '36px', borderRadius: '2px', background: TYPE_COLOR[ev.event_type], flexShrink: 0, marginTop: '2px' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '12px', color: '#f0ece4', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</div>
                      <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                        {fd(ev.event_date)}{ev.event_time ? ` às ${ft(ev.event_time)}` : ''} · {TYPE_LABEL[ev.event_type]}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '460px' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Evento' : 'Novo Evento'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Título *</label>
                <input style={inp} value={form.title || ''} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} placeholder="Nome do evento..." autoFocus />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Data *</label>
                  <input type="date" style={inp} value={form.event_date || ''} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Horário</label>
                  <input type="time" style={inp} value={form.event_time || ''} onChange={e => setForm(p => ({ ...p, event_time: e.target.value }))} />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Tipo</label>
                <select style={{ ...inp }} value={form.event_type || 'manual'} onChange={e => setForm(p => ({ ...p, event_type: e.target.value as Event['event_type'] }))}>
                  <option value="manual">Evento</option>
                  <option value="capt">Captação</option>
                  <option value="entrega">Entrega</option>
                  <option value="fixo">Fixo</option>
                </select>
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Observações</label>
                <textarea style={{ ...inp, resize: 'vertical', minHeight: '64px' }} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Detalhes do evento..." />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                {editing ? <button onClick={() => handleDelete(editing.id)} style={{ ...btnS('danger'), padding: '7px 12px', fontSize: '12px' }}>🗑 Excluir</button> : <div />}
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button onClick={() => setShowModal(false)} style={btnS('ghost')}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving} style={btnS('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar evento'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
