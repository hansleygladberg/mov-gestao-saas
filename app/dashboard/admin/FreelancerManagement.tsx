'use client'

import { useState, useEffect, useCallback } from 'react'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v) }

interface Freelancer {
  id: string
  name: string
  area?: string
  whatsapp?: string
  email?: string
  daily_rate?: number
  notes?: string
  is_active?: boolean
  created_at: string
}

const BLANK = (): Partial<Freelancer> => ({ name: '', area: '', whatsapp: '', email: '', daily_rate: 0, notes: '', is_active: true })

const inp: React.CSSProperties = { width: '100%', padding: '9px 12px', background: '#1a1a1a', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
const btn = (v: 'primary' | 'ghost' | 'danger') => ({ padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: v === 'ghost' ? '1px solid #2a2a2a' : 'none', background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent', color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : '#888', display: 'inline-flex', alignItems: 'center', gap: '6px' } as React.CSSProperties)

export default function FreelancerManagement() {
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Freelancer | null>(null)
  const [form, setForm] = useState<Partial<Freelancer>>(BLANK())
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/freelancers')
    const d = await r.json()
    setFreelancers(Array.isArray(d) ? d : [])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function openCreate() { setEditing(null); setForm(BLANK()); setShowModal(true) }
  function openEdit(f: Freelancer) {
    setEditing(f)
    setForm({ name: f.name, area: f.area || '', whatsapp: f.whatsapp || '', email: f.email || '', daily_rate: f.daily_rate || 0, notes: f.notes || '', is_active: f.is_active !== false })
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name?.trim()) { showToast('Informe o nome'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/freelancers/${editing.id}` : '/api/freelancers'
      const res = await fetch(url, { method: editing ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      await load(); setShowModal(false); showToast(editing ? 'Freelancer atualizado!' : 'Freelancer criado!')
    } catch (e: unknown) { showToast('Erro: ' + (e instanceof Error ? e.message : 'Erro')) }
    finally { setSaving(false) }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este freelancer?')) return
    await fetch(`/api/freelancers/${id}`, { method: 'DELETE' })
    await load()
    showToast('Freelancer excluído')
  }

  return (
    <div>
      {toast && <div style={{ position: 'fixed', top: 20, right: 20, background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 20px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>{toast}</div>}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#555' }}>
          {loading ? 'Carregando...' : `${freelancers.length} freelancer${freelancers.length !== 1 ? 's' : ''}`}
        </div>
        <button onClick={openCreate} style={btn('primary')}>+ Adicionar</button>
      </div>

      {!loading && freelancers.length === 0 ? (
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '30px', textAlign: 'center', color: '#555' }}>
          Nenhum freelancer cadastrado ainda
        </div>
      ) : (
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden' }}>
          {freelancers.map((f, i) => (
            <div key={f.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < freelancers.length - 1 ? '1px solid #1a1a1a' : 'none', gap: '12px' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: '#e8c547', flexShrink: 0, fontFamily: "'Montserrat', sans-serif" }}>
                {f.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{f.name}</div>
                <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>
                  {f.area && <span>{f.area}</span>}
                  {f.area && f.daily_rate ? ' · ' : ''}
                  {f.daily_rate ? <span>{fv(f.daily_rate)}/dia</span> : ''}
                  {(f.area || f.daily_rate) && f.whatsapp ? ' · ' : ''}
                  {f.whatsapp && <span>{f.whatsapp}</span>}
                </div>
              </div>
              <span style={{ fontSize: '11px', color: f.is_active !== false ? '#5db87a' : '#555' }}>
                {f.is_active !== false ? '● Ativo' : '○ Inativo'}
              </span>
              <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                <button onClick={() => openEdit(f)} style={{ ...btn('ghost'), padding: '6px 12px', fontSize: '12px' }}>Editar</button>
                <button onClick={() => handleDelete(f.id)} style={{ ...btn('danger'), padding: '6px 10px', fontSize: '12px' }}>🗑</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', width: '100%', maxWidth: '480px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Freelancer' : 'Novo Freelancer'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Nome *</label>
                  <input style={inp} value={form.name || ''} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="João Silva" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Área</label>
                  <input style={inp} value={form.area || ''} onChange={e => setForm(p => ({ ...p, area: e.target.value }))} placeholder="Câmera, Edição, Motion..." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>WhatsApp</label>
                  <input style={inp} value={form.whatsapp || ''} onChange={e => setForm(p => ({ ...p, whatsapp: e.target.value }))} placeholder="(85) 9 0000-0000" />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>E-mail</label>
                  <input type="email" style={inp} value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="joao@email.com" />
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Diária (R$)</label>
                <input type="number" style={inp} value={form.daily_rate || ''} onChange={e => setForm(p => ({ ...p, daily_rate: Number(e.target.value) }))} placeholder="0" min={0} />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Observações</label>
                <textarea style={{ ...inp, height: '70px', resize: 'vertical' as const }} value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Especializações, equipamentos, etc..." />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#888', cursor: 'pointer' }}>
                  <input type="checkbox" checked={form.is_active !== false} onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))} style={{ accentColor: '#5db87a' }} />
                  Freelancer ativo
                </label>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setShowModal(false)} style={btn('ghost')}>Cancelar</button>
                <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar' : 'Criar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
