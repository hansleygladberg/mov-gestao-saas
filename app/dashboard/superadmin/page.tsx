'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function fv(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}
function fd(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}
function toInput(d: string | null) {
  if (!d) return ''
  return d.slice(0, 10)
}

interface Company {
  id: string
  name: string
  owner_name: string
  owner_email: string
  phone: string
  is_active: boolean
  created_at: string
  subscription_status: string | null
  plan_name: string | null
  monthly_price: number | null
  billing_cycle: string | null
  trial_ends_at: string | null
  next_billing_date: string | null
  past_due_since: string | null
  dunning_attempts: number | null
  active_users: number
  total_projects: number
  open_invoices_total: number | null
}

interface Subscription {
  id: string
  company_id: string
  plan_id: string | null
  status: string
  billing_cycle: string
  base_price: number
  discount_amount: number
  final_price: number
  trial_ends_at: string | null
  current_period_start: string | null
  current_period_end: string | null
  next_billing_date: string | null
  past_due_since: string | null
  dunning_attempts: number
  notes: string | null
}

interface MRR {
  mrr: number
  total_active_subscriptions: number
  trial_count: number
  active_count: number
  past_due_count: number
  suspended_count: number
}

interface Plan {
  id: string
  name: string
  slug: string
  price_monthly: number
  is_active: boolean
}

const STATUS_COLOR: Record<string, string> = {
  trial:     '#5b9bd5',
  active:    '#5db87a',
  past_due:  '#e8c547',
  suspended: '#e85d4a',
  cancelled: '#6b7280',
}
const STATUS_LABEL: Record<string, string> = {
  trial:     'Trial',
  active:    'Ativo',
  past_due:  'Inadimplente',
  suspended: 'Suspenso',
  cancelled: 'Cancelado',
}

export default function SuperAdminPage() {
  const router = useRouter()
  const [loading, setLoading]       = useState(true)
  const [companies, setCompanies]   = useState<Company[]>([])
  const [mrr, setMrr]               = useState<MRR | null>(null)
  const [plans, setPlans]           = useState<Plan[]>([])
  const [activeTab, setActiveTab]   = useState<'empresas' | 'planos' | 'cupons'>('empresas')
  const [search, setSearch]         = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast]           = useState('')

  // Modal gestão assinatura
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null)
  const [modalTab, setModalTab]               = useState<'dados' | 'assinatura'>('dados')
  const [subscription, setSubscription]       = useState<Subscription | null>(null)
  const [subForm, setSubForm] = useState({
    plan_id: '',
    status: 'active',
    billing_cycle: 'monthly',
    base_price: 0,
    discount_amount: 0,
    trial_ends_at: '',
    next_billing_date: '',
    current_period_start: '',
    current_period_end: '',
    dunning_attempts: 0,
    notes: '',
    is_active: true,
  })
  const [subLoading, setSubLoading] = useState(false)

  // Coupon form
  const [showCouponForm, setShowCouponForm] = useState(false)
  const [couponForm, setCouponForm] = useState({
    code: '', description: '', discount_type: 'percent', discount_value: 0,
    applies_to: 'forever', applies_months: 1, max_uses: '', valid_until: '',
  })
  const [coupons, setCoupons] = useState<{id:string;code:string;description:string;discount_type:string;discount_value:number;used_count:number;is_active:boolean;valid_until:string|null}[]>([])

  function showMsg(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3500) }

  const load = useCallback(async () => {
    setLoading(true)
    const supabase = createClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) { router.push('/login'); return }
    const { data: userData } = await supabase.from('users').select('is_super_admin').eq('id', authUser.id).single()
    if (!userData?.is_super_admin) { router.push('/dashboard'); return }

    const [companiesRes, mrrRes, plansRes, couponsRes] = await Promise.all([
      supabase.from('v_companies_overview').select('*').order('created_at', { ascending: false }),
      supabase.from('v_mrr').select('*').single(),
      supabase.from('plans').select('*').order('sort_order'),
      supabase.from('coupons').select('*').order('created_at', { ascending: false }),
    ])

    setCompanies((companiesRes.data || []) as Company[])
    setMrr(mrrRes.data as MRR)
    setPlans((plansRes.data || []) as Plan[])
    setCoupons(couponsRes.data || [])
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  // Abrir modal e carregar assinatura
  async function openManage(company: Company) {
    setSelectedCompany(company)
    setModalTab('dados')
    setSubLoading(true)
    const supabase = createClient()
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (sub) {
      setSubscription(sub as Subscription)
      setSubForm({
        plan_id: sub.plan_id || '',
        status: sub.status || 'active',
        billing_cycle: sub.billing_cycle || 'monthly',
        base_price: sub.base_price || 0,
        discount_amount: sub.discount_amount || 0,
        trial_ends_at: toInput(sub.trial_ends_at),
        next_billing_date: toInput(sub.next_billing_date),
        current_period_start: toInput(sub.current_period_start),
        current_period_end: toInput(sub.current_period_end),
        dunning_attempts: sub.dunning_attempts || 0,
        notes: sub.notes || '',
        is_active: company.is_active,
      })
    } else {
      // Sem assinatura ainda — preencher com defaults
      setSubscription(null)
      setSubForm({
        plan_id: plans[0]?.id || '',
        status: 'trial',
        billing_cycle: 'monthly',
        base_price: plans[0]?.price_monthly || 0,
        discount_amount: 0,
        trial_ends_at: '',
        next_billing_date: '',
        current_period_start: '',
        current_period_end: '',
        dunning_attempts: 0,
        notes: '',
        is_active: company.is_active,
      })
    }
    setSubLoading(false)
  }

  function closeModal() {
    setSelectedCompany(null)
    setSubscription(null)
  }

  async function saveSubscription() {
    if (!selectedCompany) return
    setActionLoading('save')
    const supabase = createClient()

    // Calcular final_price
    const selectedPlan = plans.find(p => p.id === subForm.plan_id)
    const basePrice = subForm.base_price || selectedPlan?.price_monthly || 0
    const finalPrice = Math.max(0, basePrice - (subForm.discount_amount || 0))

    // plan_id deve ser null se vazio (não pode ser string vazia para UUID)
    const planId = subForm.plan_id || null

    const subData = {
      company_id: selectedCompany.id,
      plan_id: planId,
      status: subForm.status,
      billing_cycle: subForm.billing_cycle,
      base_price: basePrice,
      discount_amount: subForm.discount_amount || 0,
      final_price: finalPrice,
      trial_ends_at: subForm.trial_ends_at || null,
      next_billing_date: subForm.next_billing_date || null,
      current_period_start: subForm.current_period_start || null,
      current_period_end: subForm.current_period_end || null,
      dunning_attempts: subForm.dunning_attempts || 0,
      past_due_since: subForm.status === 'past_due'
        ? (subscription?.past_due_since || new Date().toISOString())
        : null,
      notes: subForm.notes || null,
      updated_at: new Date().toISOString(),
    }

    // Atualizar ou criar assinatura
    let subError
    if (subscription) {
      // Ao atualizar, excluir company_id para evitar conflito de constraint única
      const { company_id: _cid, ...updateData } = subData
      const { error } = await supabase.from('subscriptions').update(updateData).eq('id', subscription.id)
      subError = error
    } else {
      const { error } = await supabase.from('subscriptions').insert([subData])
      subError = error
    }

    if (subError) {
      console.error('Erro ao salvar assinatura:', subError)
      showMsg('Erro ao salvar assinatura: ' + subError.message)
      setActionLoading(null)
      return
    }

    // Atualizar is_active na empresa
    await supabase.from('companies').update({ is_active: subForm.is_active }).eq('id', selectedCompany.id)

    showMsg(`✅ Assinatura de "${selectedCompany.name}" atualizada!`)
    setActionLoading(null)
    closeModal()
    await load()
  }

  async function saveCoupon() {
    if (!couponForm.code || !couponForm.discount_value) return
    const supabase = createClient()
    const { error } = await supabase.from('coupons').insert([{
      code: couponForm.code.toUpperCase(),
      description: couponForm.description || null,
      discount_type: couponForm.discount_type,
      discount_value: Number(couponForm.discount_value),
      applies_to: couponForm.applies_to,
      applies_months: couponForm.applies_to === 'months' ? Number(couponForm.applies_months) : null,
      max_uses: couponForm.max_uses ? Number(couponForm.max_uses) : null,
      valid_until: couponForm.valid_until || null,
    }])
    if (error) { showMsg('Erro: ' + error.message); return }
    showMsg('Cupom criado!')
    setShowCouponForm(false)
    setCouponForm({ code: '', description: '', discount_type: 'percent', discount_value: 0, applies_to: 'forever', applies_months: 1, max_uses: '', valid_until: '' })
    await load()
  }

  async function toggleCoupon(id: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('coupons').update({ is_active: !current }).eq('id', id)
    await load()
  }

  const filtered = companies.filter(c => {
    const matchSearch = !search || c.name?.toLowerCase().includes(search.toLowerCase()) || c.owner_email?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !filterStatus || c.subscription_status === filterStatus
    return matchSearch && matchStatus
  })

  const finalPrice = Math.max(0, (subForm.base_price || 0) - (subForm.discount_amount || 0))

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', background: '#1a1d24',
    border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }
  const label: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: '#555',
    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555', fontSize: '13px' }}>Carregando painel...</div>
    </div>
  )

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 18px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* ── MODAL GESTÃO ASSINATURA ─────────────────────────────────── */}
      {selectedCompany && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
          onClick={e => { if (e.target === e.currentTarget) closeModal() }}
        >
          <div style={{ background: '#111318', border: '1px solid #2a2d35', borderRadius: '14px', width: '100%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto' }}>

            {/* Cabeçalho modal */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>
                  {selectedCompany.name}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                  {selectedCompany.owner_email || '—'}
                  {selectedCompany.phone ? ` · ${selectedCompany.phone}` : ''}
                </div>
              </div>
              <button onClick={closeModal} style={{ background: 'none', border: 'none', color: '#555', fontSize: '20px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>✕</button>
            </div>

            {/* Abas */}
            <div style={{ display: 'flex', borderBottom: '1px solid #1f2229' }}>
              {([{ key: 'dados', label: '👤 Dados do Cliente' }, { key: 'assinatura', label: '⚙️ Assinatura' }] as const).map(t => (
                <button key={t.key} onClick={() => setModalTab(t.key)} style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  borderBottom: modalTab === t.key ? '2px solid #e8c547' : '2px solid transparent',
                  color: modalTab === t.key ? '#e8c547' : '#555',
                  fontSize: '13px', fontWeight: modalTab === t.key ? 600 : 400,
                  padding: '10px 20px', marginBottom: '-1px',
                  fontFamily: "'Montserrat', sans-serif",
                }}>{t.label}</button>
              ))}
            </div>

            {/* ABA: DADOS DO CLIENTE */}
            {modalTab === 'dados' && (
              <div style={{ padding: '24px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'Nome da Empresa', value: selectedCompany.name },
                    { label: 'Responsável', value: selectedCompany.owner_name || '—' },
                    { label: 'E-mail', value: selectedCompany.owner_email || '—' },
                    { label: 'Telefone', value: selectedCompany.phone || '—' },
                  ].map(f => (
                    <div key={f.label} style={{ background: '#0d0f12', border: '1px solid #1f2229', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '4px' }}>{f.label}</div>
                      <div style={{ fontSize: '13px', color: '#f0ece4', wordBreak: 'break-all' as const }}>{f.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  {[
                    { label: 'Usuários', value: String(selectedCompany.active_users) },
                    { label: 'Projetos', value: String(selectedCompany.total_projects) },
                    { label: 'Plano Atual', value: selectedCompany.plan_name || 'Sem plano' },
                  ].map(f => (
                    <div key={f.label} style={{ background: '#0d0f12', border: '1px solid #1f2229', borderRadius: '8px', padding: '12px 14px', textAlign: 'center' as const }}>
                      <div style={{ fontSize: '18px', fontWeight: 700, color: '#e8c547' }}>{f.value}</div>
                      <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginTop: '4px' }}>{f.label}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                  {[
                    { label: 'Status', value: STATUS_LABEL[selectedCompany.subscription_status || ''] || 'Sem plano', color: STATUS_COLOR[selectedCompany.subscription_status || ''] || '#555' },
                    { label: 'Acesso', value: selectedCompany.is_active ? '✅ Liberado' : '🚫 Bloqueado', color: selectedCompany.is_active ? '#5db87a' : '#e85d4a' },
                    { label: 'Membro desde', value: fd(selectedCompany.created_at) },
                    { label: 'Trial expira', value: fd(selectedCompany.trial_ends_at) },
                  ].map(f => (
                    <div key={f.label} style={{ background: '#0d0f12', border: '1px solid #1f2229', borderRadius: '8px', padding: '12px 14px' }}>
                      <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '4px' }}>{f.label}</div>
                      <div style={{ fontSize: '13px', color: (f as {color?: string}).color || '#f0ece4', fontWeight: 600 }}>{f.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={closeModal} style={{ padding: '9px 20px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '8px', color: '#888', fontSize: '13px', cursor: 'pointer' }}>Fechar</button>
                  <button onClick={() => setModalTab('assinatura')} style={{ padding: '9px 20px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                    ⚙️ Gerenciar Assinatura →
                  </button>
                </div>
              </div>
            )}

            {/* ABA: ASSINATURA */}
            {modalTab === 'assinatura' && subLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#555', fontSize: '13px' }}>Carregando assinatura...</div>
            ) : modalTab === 'assinatura' ? (
              <div style={{ padding: '24px' }}>

                {/* BLOCO: Plano e Status */}
                <div style={{ background: '#0d0f12', borderRadius: '10px', padding: '18px', marginBottom: '16px', border: '1px solid #1f2229' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8c547', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>📦 Plano e Cobrança</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={label}>Plano</label>
                      <select style={inp} value={subForm.plan_id} onChange={e => {
                        const p = plans.find(pl => pl.id === e.target.value)
                        setSubForm(f => ({ ...f, plan_id: e.target.value, base_price: p?.price_monthly || f.base_price }))
                      }}>
                        <option value="">Sem plano</option>
                        {plans.map(p => (
                          <option key={p.id} value={p.id}>{p.name} — {fv(p.price_monthly)}/mês</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={label}>Ciclo de cobrança</label>
                      <select style={inp} value={subForm.billing_cycle} onChange={e => setSubForm(f => ({ ...f, billing_cycle: e.target.value }))}>
                        <option value="monthly">Mensal</option>
                        <option value="annual">Anual</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={label}>Preço base (R$)</label>
                      <input type="number" style={inp} value={subForm.base_price || ''} onChange={e => setSubForm(f => ({ ...f, base_price: Number(e.target.value) }))} placeholder="197" />
                    </div>
                    <div>
                      <label style={label}>Desconto (R$)</label>
                      <input type="number" style={inp} value={subForm.discount_amount || ''} onChange={e => setSubForm(f => ({ ...f, discount_amount: Number(e.target.value) }))} placeholder="0" />
                    </div>
                    <div>
                      <label style={label}>Valor final</label>
                      <div style={{ ...inp, background: '#0d0f12', color: finalPrice > 0 ? '#5db87a' : '#6b7280', fontWeight: 700, cursor: 'default' }}>
                        {fv(finalPrice)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* BLOCO: Status */}
                <div style={{ background: '#0d0f12', borderRadius: '10px', padding: '18px', marginBottom: '16px', border: '1px solid #1f2229' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8c547', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>📊 Status da Assinatura</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={label}>Status</label>
                      <select style={{ ...inp, color: STATUS_COLOR[subForm.status] || '#f0ece4' }} value={subForm.status} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="trial">🔵 Trial</option>
                        <option value="active">✅ Ativo</option>
                        <option value="past_due">⚠️ Inadimplente</option>
                        <option value="suspended">🚫 Suspenso</option>
                        <option value="cancelled">❌ Cancelado</option>
                      </select>
                    </div>
                    <div>
                      <label style={label}>Tentativas de cobrança</label>
                      <input type="number" style={inp} value={subForm.dunning_attempts} onChange={e => setSubForm(f => ({ ...f, dunning_attempts: Number(e.target.value) }))} min="0" max="10" />
                    </div>
                  </div>
                </div>

                {/* BLOCO: Datas */}
                <div style={{ background: '#0d0f12', borderRadius: '10px', padding: '18px', marginBottom: '16px', border: '1px solid #1f2229' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8c547', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>📅 Datas</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={label}>Trial expira em</label>
                      <input type="date" style={inp} value={subForm.trial_ends_at} onChange={e => setSubForm(f => ({ ...f, trial_ends_at: e.target.value }))} />
                    </div>
                    <div>
                      <label style={label}>Próxima cobrança</label>
                      <input type="date" style={inp} value={subForm.next_billing_date} onChange={e => setSubForm(f => ({ ...f, next_billing_date: e.target.value }))} />
                    </div>
                    <div>
                      <label style={label}>Início do período atual</label>
                      <input type="date" style={inp} value={subForm.current_period_start} onChange={e => setSubForm(f => ({ ...f, current_period_start: e.target.value }))} />
                    </div>
                    <div>
                      <label style={label}>Fim do período atual</label>
                      <input type="date" style={inp} value={subForm.current_period_end} onChange={e => setSubForm(f => ({ ...f, current_period_end: e.target.value }))} />
                    </div>
                  </div>
                </div>

                {/* BLOCO: Acesso */}
                <div style={{ background: '#0d0f12', borderRadius: '10px', padding: '18px', marginBottom: '16px', border: '1px solid #1f2229' }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: '#e8c547', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px' }}>🔐 Acesso à Plataforma</div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {[true, false].map(val => (
                      <button
                        key={String(val)}
                        onClick={() => setSubForm(f => ({ ...f, is_active: val }))}
                        style={{
                          flex: 1, padding: '10px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
                          border: subForm.is_active === val ? 'none' : '1px solid #2a2d35',
                          background: subForm.is_active === val
                            ? (val ? 'rgba(93,184,122,.2)' : 'rgba(232,93,74,.2)')
                            : '#1a1d24',
                          color: subForm.is_active === val
                            ? (val ? '#5db87a' : '#e85d4a')
                            : '#6b7280',
                        }}
                      >
                        {val ? '✅ Acesso liberado' : '🚫 Acesso bloqueado'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* BLOCO: Observações */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={label}>Observações internas</label>
                  <textarea
                    style={{ ...inp, minHeight: '70px', resize: 'vertical' }}
                    value={subForm.notes}
                    onChange={e => setSubForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Notas sobre este cliente, negociações especiais, etc..."
                  />
                </div>

                {/* Ações */}
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                  <button onClick={closeModal} style={{ padding: '10px 22px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '8px', color: '#888', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                    Cancelar
                  </button>
                  <button
                    onClick={saveSubscription}
                    disabled={actionLoading === 'save'}
                    style={{ padding: '10px 28px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', opacity: actionLoading === 'save' ? 0.7 : 1 }}
                  >
                    {actionLoading === 'save' ? '⏳ Salvando...' : '💾 Salvar Alterações'}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <span style={{ fontSize: '20px' }}>🛡️</span>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '24px', fontWeight: 700, color: '#f0ece4' }}>Super Admin</h1>
          <span style={{ fontSize: '11px', padding: '2px 10px', background: 'rgba(232,93,74,.15)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '20px', color: '#e85d4a', fontWeight: 700 }}>PLATAFORMA</span>
        </div>
        <p style={{ color: '#4b5563', fontSize: '13px' }}>Gestão completa de empresas, planos e assinaturas</p>
      </div>

      {/* KPIs */}
      {mrr && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px', marginBottom: '28px' }}>
          {[
            { label: 'MRR', value: fv(mrr.mrr || 0), color: '#5db87a', icon: '💰' },
            { label: 'TRIALS', value: String(mrr.trial_count || 0), color: '#5b9bd5', icon: '🔵' },
            { label: 'ATIVOS', value: String(mrr.active_count || 0), color: '#5db87a', icon: '✅' },
            { label: 'INADIMPLENTES', value: String(mrr.past_due_count || 0), color: '#e8c547', icon: '⚠️' },
            { label: 'SUSPENSOS', value: String(mrr.suspended_count || 0), color: '#e85d4a', icon: '🚫' },
            { label: 'TOTAL', value: String(mrr.total_active_subscriptions || 0), color: '#9b8fd5', icon: '🏢' },
          ].map(k => (
            <div key={k.label} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px 18px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '8px' }}>{k.icon} {k.label}</div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid #1f2229', marginBottom: '24px', display: 'flex', gap: '0' }}>
        {([
          { key: 'empresas', label: `🏢 Empresas (${companies.length})` },
          { key: 'planos',   label: `📦 Planos` },
          { key: 'cupons',   label: `🎫 Cupons (${coupons.length})` },
        ] as const).map(t => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
            background: 'none', border: 'none',
            borderBottom: activeTab === t.key ? '2px solid #e8c547' : '2px solid transparent',
            color: activeTab === t.key ? '#e8c547' : '#555',
            fontSize: '13px', fontWeight: activeTab === t.key ? 600 : 500,
            padding: '10px 20px', cursor: 'pointer',
            fontFamily: "'Montserrat', sans-serif", marginBottom: '-1px',
          }}>{t.label}</button>
        ))}
      </div>

      {/* ── TAB: EMPRESAS ────────────────────────────────────────────── */}
      {activeTab === 'empresas' && (
        <div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <input
              style={{ ...inp, maxWidth: '280px' }}
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="🔍 Buscar empresa ou email..."
            />
            <select style={{ ...inp, maxWidth: '180px' }} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">Todos os status</option>
              <option value="trial">Trial</option>
              <option value="active">Ativo</option>
              <option value="past_due">Inadimplente</option>
              <option value="suspended">Suspenso</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filtered.length === 0 && (
              <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>
                Nenhuma empresa encontrada
              </div>
            )}
            {filtered.map(c => {
              const status = c.subscription_status || 'sem_plano'
              const statusColor = STATUS_COLOR[status] || '#555'
              const isPastDue = status === 'past_due'
              return (
                <div key={c.id} style={{ background: '#111318', border: `1px solid ${isPastDue ? 'rgba(232,197,71,.3)' : '#1f2229'}`, borderRadius: '10px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>

                  <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: statusColor, flexShrink: 0 }} />

                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#f0ece4' }}>{c.name}</span>
                      <span style={{ fontSize: '11px', padding: '2px 8px', background: statusColor + '22', color: statusColor, borderRadius: '20px', fontWeight: 600 }}>
                        {STATUS_LABEL[status] || status}
                      </span>
                      {!c.is_active && (
                        <span style={{ fontSize: '11px', padding: '2px 8px', background: 'rgba(232,93,74,.15)', color: '#e85d4a', borderRadius: '20px', fontWeight: 600 }}>
                          🚫 Bloqueado
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#6b7280', flexWrap: 'wrap' }}>
                      {c.owner_name && <span>👤 {c.owner_name}</span>}
                      <span style={{ color: c.owner_email ? '#6b7280' : '#3a3a3a' }}>
                        ✉️ {c.owner_email || '—'}
                      </span>
                      {c.phone && <span>📱 {c.phone}</span>}
                    </div>
                  </div>

                  {/* Métricas */}
                  <div style={{ display: 'flex', gap: '24px', fontSize: '12px', color: '#6b7280', flexShrink: 0 }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f0ece4', fontWeight: 600 }}>{c.active_users}</div>
                      <div>usuários</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ color: '#f0ece4', fontWeight: 600 }}>{c.total_projects}</div>
                      <div>projetos</div>
                    </div>
                    {c.plan_name && (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ color: '#5db87a', fontWeight: 700 }}>{fv(c.monthly_price || 0)}</div>
                        <div>{c.plan_name}</div>
                      </div>
                    )}
                  </div>

                  {/* Datas */}
                  <div style={{ fontSize: '12px', color: '#6b7280', flexShrink: 0, minWidth: '130px' }}>
                    {status === 'trial' && c.trial_ends_at && (
                      <div>⏳ Trial até {fd(c.trial_ends_at)}</div>
                    )}
                    {status === 'active' && c.next_billing_date && (
                      <div>📅 Próx. cobrança {fd(c.next_billing_date)}</div>
                    )}
                    {isPastDue && c.past_due_since && (
                      <div style={{ color: '#e8c547' }}>⚠️ Inadimp. desde {fd(c.past_due_since)}<br />Tentativas: {c.dunning_attempts}</div>
                    )}
                    {c.open_invoices_total && c.open_invoices_total > 0 ? (
                      <div style={{ color: '#e8c547', marginTop: '2px' }}>💳 {fv(c.open_invoices_total)} em aberto</div>
                    ) : null}
                    <div style={{ color: '#4b5563', marginTop: '2px' }}>Desde {fd(c.created_at)}</div>
                  </div>

                  {/* Ações */}
                  <div style={{ flexShrink: 0 }}>
                    <button
                      onClick={() => openManage(c)}
                      style={{
                        padding: '7px 16px',
                        borderRadius: '8px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: '1px solid #2a2d35',
                        background: '#1a1d24',
                        color: '#e8c547',
                      }}
                    >
                      ⚙️ Gerenciar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── TAB: PLANOS ──────────────────────────────────────────────── */}
      {activeTab === 'planos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px' }}>
          {plans.map(p => (
            <div key={p.id} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '18px', fontWeight: 700, color: '#f0ece4' }}>{p.name}</span>
                <span style={{ fontSize: '11px', padding: '2px 8px', background: p.is_active ? 'rgba(93,184,122,.15)' : 'rgba(107,114,128,.15)', color: p.is_active ? '#5db87a' : '#6b7280', borderRadius: '20px', fontWeight: 600 }}>
                  {p.is_active ? '✓ Ativo' : 'Inativo'}
                </span>
              </div>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '28px', fontWeight: 700, color: '#5db87a', marginBottom: '4px' }}>
                {fv(p.price_monthly)}<span style={{ fontSize: '14px', color: '#4b5563', fontWeight: 400 }}>/mês</span>
              </div>
              <div style={{ fontSize: '12px', color: '#4b5563' }}>slug: {p.slug}</div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                {companies.filter(c => c.plan_name === p.name).length} empresa(s) neste plano
              </div>
            </div>
          ))}
          <div style={{ background: '#111318', border: '1px dashed #2a2d35', borderRadius: '12px', padding: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#4b5563' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>+</div>
              <div style={{ fontSize: '13px' }}>Editar planos via<br />SQL Editor no Supabase</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB: CUPONS ──────────────────────────────────────────────── */}
      {activeTab === 'cupons' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
            <button
              onClick={() => setShowCouponForm(s => !s)}
              style={{ padding: '9px 20px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {showCouponForm ? '✕ Cancelar' : '+ Novo Cupom'}
            </button>
          </div>

          {showCouponForm && (
            <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', fontWeight: 700, color: '#f0ece4', marginBottom: '16px' }}>Novo Cupom</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={label}>Código *</label>
                  <input style={inp} value={couponForm.code} onChange={e => setCouponForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PROMO50" />
                </div>
                <div>
                  <label style={label}>Descrição</label>
                  <input style={inp} value={couponForm.description} onChange={e => setCouponForm(f => ({ ...f, description: e.target.value }))} placeholder="Uso interno..." />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={label}>Tipo</label>
                  <select style={inp} value={couponForm.discount_type} onChange={e => setCouponForm(f => ({ ...f, discount_type: e.target.value }))}>
                    <option value="percent">Porcentagem (%)</option>
                    <option value="fixed">Valor fixo (R$)</option>
                  </select>
                </div>
                <div>
                  <label style={label}>Valor {couponForm.discount_type === 'percent' ? '(%)' : '(R$)'}</label>
                  <input type="number" style={inp} value={couponForm.discount_value || ''} onChange={e => setCouponForm(f => ({ ...f, discount_value: Number(e.target.value) }))} placeholder="50" />
                </div>
                <div>
                  <label style={label}>Duração</label>
                  <select style={inp} value={couponForm.applies_to} onChange={e => setCouponForm(f => ({ ...f, applies_to: e.target.value }))}>
                    <option value="once">Só 1ª mensalidade</option>
                    <option value="months">Por N meses</option>
                    <option value="forever">Para sempre</option>
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <label style={label}>Máx. de usos (vazio = ilimitado)</label>
                  <input type="number" style={inp} value={couponForm.max_uses} onChange={e => setCouponForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="100" />
                </div>
                <div>
                  <label style={label}>Válido até (vazio = sem expiração)</label>
                  <input type="date" style={inp} value={couponForm.valid_until} onChange={e => setCouponForm(f => ({ ...f, valid_until: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={saveCoupon} style={{ padding: '9px 24px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                  💾 Salvar Cupom
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {coupons.length === 0 && (
              <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '40px', textAlign: 'center', color: '#4b5563', fontSize: '13px' }}>
                Nenhum cupom criado ainda
              </div>
            )}
            {coupons.map(c => (
              <div key={c.id} style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '14px 20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '15px', fontWeight: 700, color: '#e8c547' }}>{c.code}</span>
                    {c.is_active
                      ? <span style={{ fontSize: '11px', padding: '1px 8px', background: 'rgba(93,184,122,.15)', color: '#5db87a', borderRadius: '20px' }}>Ativo</span>
                      : <span style={{ fontSize: '11px', padding: '1px 8px', background: 'rgba(107,114,128,.15)', color: '#6b7280', borderRadius: '20px' }}>Inativo</span>
                    }
                  </div>
                  <div style={{ fontSize: '12px', color: '#6b7280' }}>
                    {c.discount_type === 'percent' ? `${c.discount_value}% de desconto` : `R$${c.discount_value} de desconto`}
                    {c.description ? ` · ${c.description}` : ''}
                    {' · '}{c.used_count} uso(s)
                    {c.valid_until ? ` · válido até ${fd(c.valid_until)}` : ''}
                  </div>
                </div>
                <button
                  onClick={() => toggleCoupon(c.id, c.is_active)}
                  style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: 'none', background: c.is_active ? 'rgba(107,114,128,.15)' : 'rgba(93,184,122,.15)', color: c.is_active ? '#6b7280' : '#5db87a' }}>
                  {c.is_active ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
