'use client'

import { useState, useEffect, useCallback } from 'react'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }

interface Client {
  id: string; name: string; segment?: string; phone?: string; email?: string
  whatsapp?: string; monthly_value?: number; created_at: string
}

const BLANK = (): Partial<Client> => ({ name: '', segment: '', phone: '', email: '', whatsapp: '', monthly_value: 0 })

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btn = (v: 'primary' | 'ghost' | 'danger') => ({ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: v === 'ghost' ? '1px solid #2a2a2a' : 'none', background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent', color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#888', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties)

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Client | null>(null)
  const [form, setForm] = useState<Partial<Client>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }
  const load = useCallback(async () => { setLoading(true); const r = await fetch('/api/clients'); const d = await r.json(); setClients(Array.isArray(d) ? d : []); setLoading(false) }, [])
  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(BLANK()); setShowModal(true) }
  function openEdit(c: Client) { setEditing(c); setForm({ name: c.name, segment: c.segment || '', phone: c.phone || '', email: c.email || '', whatsapp: c.whatsapp || '', monthly_value: c.monthly_value || 0 }); setShowModal(true) }

  async function handleSave() {
    if (!form.name?.trim()) { showToast('Informe o nome'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/clients/${editing.id}` : '/api/clients'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load(); setShowModal(false); showToast(editing ? 'Cliente atualizado!' : 'Cliente criado!')
    } catch (e: unknown) { showToast('Erro: ' + (e instanceof Error ? e.message : 'Erro')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este cliente?')) return
    await fetch(`/api/clients/${id}`, { method: 'DELETE' }); await load(); showToast('Cliente excluído')
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.email || '').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 20px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>{toast}</div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Clientes</h1>
          <p style={{ color: '#555', fontSize: '13px' }}>{clients.length} cliente{clients.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={openCreate} style={btn('primary')}>+ Novo Cliente</button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <input style={{ ...inp, maxWidth: '320px' }} placeholder="Buscar por nome ou email..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
          <div style={{ fontSize: '36px', marginBottom: '12px' }}>👥</div>
          <div style={{ fontSize: '15px', color: '#888', marginBottom: '6px' }}>Nenhum cliente cadastrado</div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
          {filtered.map(c => {
            const ini = c.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
            return (
              <div key={c.id} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', color: '#e8c547', flexShrink: 0 }}>{ini}</div>
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
                  <button onClick={() => openEdit(c)} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '12px' }}>✏️ Editar</button>
                  <button onClick={() => handleDelete(c.id)} style={{ ...btn('danger'), padding: '6px 10px', fontSize: '12px' }}>🗑</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

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
                { key: 'email', label: 'E-mail', placeholder: 'contato@empresa.com', type: 'email' },
                { key: 'monthly_value', label: 'Valor mensal (contrato fixo)', placeholder: '0', type: 'number' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>{f.label}</label>
                  <input type={f.type} style={inp} value={(form as Record<string, unknown>)[f.key] as string || ''} onChange={e => setForm(p => ({ ...p, [f.key]: f.type === 'number' ? Number(e.target.value) : e.target.value }))} placeholder={f.placeholder} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => setShowModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar cliente'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
