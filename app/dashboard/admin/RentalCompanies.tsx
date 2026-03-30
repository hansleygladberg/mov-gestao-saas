'use client'

import { useState, useEffect, useCallback } from 'react'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }

const MONTHS_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

interface RentalRecord {
  month: string // 'YYYY-MM'
  count: number
  total: number
  notes?: string
}

interface RentalCompany {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  notes?: string
  data?: { records?: RentalRecord[] }
  created_at: string
}

const BLANK = (): Partial<RentalCompany> => ({ name: '', contact: '', phone: '', email: '', notes: '' })

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#1a1d24',
  border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}
const btn = (v: 'primary' | 'ghost' | 'danger') => ({
  padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
  cursor: 'pointer', border: v === 'ghost' ? '1px solid #2a2d35' : 'none',
  background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent',
  color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#6b7280',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
} as React.CSSProperties)

export default function RentalCompanies() {
  const [companies, setCompanies] = useState<RentalCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<RentalCompany | null>(null)
  const [form, setForm] = useState<Partial<RentalCompany>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  // Record form
  const now = new Date()
  const [recForm, setRecForm] = useState({
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    count: 1,
    total: 0,
    notes: '',
  })
  const [savingRec, setSavingRec] = useState(false)

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/rental-companies')
    const d = await r.json()
    setCompanies(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(BLANK()); setShowModal(true) }
  function openEdit(c: RentalCompany) {
    setEditing(c)
    setForm({ name: c.name, contact: c.contact || '', phone: c.phone || '', email: c.email || '', notes: c.notes || '' })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name?.trim()) { showToast('Informe o nome'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/rental-companies/${editing.id}` : '/api/rental-companies'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) throw new Error((await res.json()).error)
      await load(); setShowModal(false); showToast(editing ? 'Empresa atualizada!' : 'Empresa cadastrada!')
    } catch (e: unknown) { showToast('Erro: ' + (e instanceof Error ? e.message : 'Erro')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir esta empresa de locação?')) return
    await fetch(`/api/rental-companies/${id}`, { method: 'DELETE' })
    await load(); showToast('Empresa excluída')
  }

  async function addRecord(company: RentalCompany) {
    if (!recForm.total) { showToast('Informe o valor pago'); return }
    setSavingRec(true)
    const existingRecords = company.data?.records || []
    // Remove if same month exists, then add updated
    const filtered = existingRecords.filter(r => r.month !== recForm.month)
    const existing = existingRecords.find(r => r.month === recForm.month)
    const newRecord: RentalRecord = {
      month: recForm.month,
      count: existing ? existing.count + recForm.count : recForm.count,
      total: existing ? existing.total + recForm.total : recForm.total,
      notes: recForm.notes || existing?.notes || '',
    }
    const records = [...filtered, newRecord].sort((a, b) => b.month.localeCompare(a.month))
    try {
      const res = await fetch(`/api/rental-companies/${company.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { records } }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      await load()
      setRecForm(f => ({ ...f, count: 1, total: 0, notes: '' }))
      showToast('Registro adicionado!')
    } catch (e: unknown) { showToast('Erro: ' + (e instanceof Error ? e.message : 'Erro')) }
    finally { setSavingRec(false) }
  }

  async function removeRecord(company: RentalCompany, month: string) {
    const records = (company.data?.records || []).filter(r => r.month !== month)
    await fetch(`/api/rental-companies/${company.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ data: { records } }) })
    await load()
  }

  function monthLabel(m: string) {
    const [y, mo] = m.split('-')
    return `${MONTHS_FULL[parseInt(mo) - 1]} ${y}`
  }

  // Stats totais
  const totalPaidAllTime = companies.reduce((s, c) => s + (c.data?.records || []).reduce((ss, r) => ss + r.total, 0), 0)
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const totalPaidThisMonth = companies.reduce((s, c) => s + ((c.data?.records || []).find(r => r.month === currentMonth)?.total || 0), 0)

  if (loading) return <div style={{ color: '#555', fontSize: '13px', padding: '20px 0' }}>Carregando...</div>

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 18px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>{toast}</div>}

      {/* Stats banner */}
      {companies.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          {[
            { label: 'Empresas cadastradas', value: companies.length.toString(), color: '#5b9bd5' },
            { label: 'Pago este mês', value: fv(totalPaidThisMonth), color: '#e8924a' },
            { label: 'Total histórico', value: fv(totalPaidAllTime), color: '#e85d4a' },
          ].map(k => (
            <div key={k.label} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>{k.label}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '18px', fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <button onClick={openCreate} style={btn('primary')}>+ Cadastrar Empresa</button>
      </div>

      {companies.length === 0 ? (
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>
          Nenhuma empresa de locação cadastrada
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {companies.map(c => {
            const records = (c.data?.records || []).slice().sort((a, b) => (b.month > a.month ? 1 : b.month < a.month ? -1 : 0))
            const totalPaid = records.reduce((s, r) => s + r.total, 0)
            const totalCount = records.reduce((s, r) => s + r.count, 0)
            const thisMonth = records.find(r => r.month === currentMonth)
            const isOpen = expanded === c.id

            return (
              <div key={c.id} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Company row */}
                <div style={{ display: 'flex', alignItems: 'center', padding: '14px 18px', gap: '12px', cursor: 'pointer' }} onClick={() => setExpanded(isOpen ? null : c.id)}>
                  <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#1a1d24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8924a', flexShrink: 0 }}>
                    {c.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', color: '#f0ece4', fontWeight: 600 }}>{c.name}</div>
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>
                      {c.contact && <span>{c.contact} · </span>}
                      {c.phone && <span>{c.phone}</span>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    {thisMonth ? (
                      <div style={{ fontSize: '12px', color: '#e8924a', fontWeight: 600 }}>Este mês: {fv(thisMonth.total)}</div>
                    ) : (
                      <div style={{ fontSize: '11px', color: '#4b5563' }}>Sem registro este mês</div>
                    )}
                    <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>Total: {fv(totalPaid)} · {totalCount} loc{totalCount !== 1 ? 'ações' : 'ação'}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(c) }} style={{ ...btn('ghost'), padding: '5px 10px' }}>✏️</button>
                    <button onClick={e => { e.stopPropagation(); handleDelete(c.id) }} style={{ ...btn('danger'), padding: '5px 10px' }}>🗑</button>
                  </div>
                  <div style={{ color: '#4b5563', fontSize: '12px' }}>{isOpen ? '▲' : '▼'}</div>
                </div>

                {/* Expanded: history + add record */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid #1f2229', padding: '16px 18px', background: '#0d0f12' }}>
                    {/* Add record form */}
                    <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Registrar locação</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Mês/Ano</label>
                          <input type="month" style={inp} value={recForm.month} onChange={e => setRecForm(f => ({ ...f, month: e.target.value }))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Qtd locações</label>
                          <input type="number" min={1} style={inp} value={recForm.count} onChange={e => setRecForm(f => ({ ...f, count: Number(e.target.value) }))} />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Valor pago (R$)</label>
                          <input type="number" min={0} style={inp} value={recForm.total || ''} onChange={e => setRecForm(f => ({ ...f, total: Number(e.target.value) }))} placeholder="0" />
                        </div>
                        <div>
                          <label style={{ display: 'block', fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px' }}>Obs.</label>
                          <input style={inp} value={recForm.notes} onChange={e => setRecForm(f => ({ ...f, notes: e.target.value }))} placeholder="Opcional..." />
                        </div>
                        <button onClick={() => addRecord(c)} disabled={savingRec} style={{ ...btn('primary'), padding: '9px 14px', whiteSpace: 'nowrap' as const }}>
                          {savingRec ? '...' : '+ Adicionar'}
                        </button>
                      </div>
                    </div>

                    {/* History */}
                    <div style={{ fontSize: '11px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Histórico mensal</div>
                    {records.length === 0 ? (
                      <div style={{ fontSize: '12px', color: '#4b5563', textAlign: 'center', padding: '16px' }}>Nenhum registro ainda</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {records.map(r => (
                          <div key={r.month} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '8px 12px', background: '#111318', borderRadius: '8px', border: '1px solid #1f2229' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{monthLabel(r.month)}</div>
                              {r.notes && <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '1px' }}>{r.notes}</div>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{r.count} locaç{r.count !== 1 ? 'ões' : 'ão'}</div>
                            <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8924a' }}>{fv(r.total)}</div>
                            <button onClick={() => removeRecord(c, r.month)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '14px', padding: '2px 4px' }}>×</button>
                          </div>
                        ))}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 12px', borderTop: '1px solid #1f2229', gap: '20px' }}>
                          <span style={{ fontSize: '12px', color: '#6b7280' }}>Total: {totalCount} locaç{totalCount !== 1 ? 'ões' : 'ão'}</span>
                          <span style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#e85d4a' }}>{fv(totalPaid)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal cadastro/edição */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', width: '100%', maxWidth: '480px' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Empresa' : 'Nova Empresa de Locação'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#4b5563', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '20px 24px' }}>
              {[
                { key: 'name', label: 'Nome da empresa *', placeholder: 'Locações ABC', type: 'text' },
                { key: 'contact', label: 'Responsável / Contato', placeholder: 'João Silva', type: 'text' },
                { key: 'phone', label: 'Telefone / WhatsApp', placeholder: '(85) 9 0000-0000', type: 'text' },
                { key: 'email', label: 'E-mail', placeholder: 'contato@empresa.com', type: 'email' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>{f.label}</label>
                  <input type={f.type} style={inp} value={(form as Record<string, string>)[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
              <div style={{ marginBottom: '18px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Observações</label>
                <textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' as const }} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Equipamentos disponíveis, condições, etc..." />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
