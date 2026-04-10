'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useToast } from '@/lib/toast'
import { EmptyState } from '@/components/EmptyState'
import { createClient } from '@/lib/supabase/client'

function fv(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}
function fd(d: string) {
  if (!d) return '—'
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

const PIPELINE = ['producao', 'edicao', 'aguardando_cliente', 'revisao', 'aprovado', 'finalizado'] as const

const ST_LABEL: Record<string, string> = {
  orcamento: 'Orçamento',
  producao: 'Em Produção',
  edicao: 'Edição',
  aguardando_cliente: 'Aguard. Cliente',
  revisao: 'Revisão',
  aprovado: 'Aprovado',
  finalizado: 'Finalizado',
  pausado: 'Pausado',
  orcamento_desaprovado: 'Reprovado',
  // backward compat
  para_captacao: 'Em Produção',
  enviado: 'Aprovado',
  entregue: 'Finalizado',
}

const ST_COLOR: Record<string, string> = {
  orcamento: '#5b9bd5',
  producao: '#e8924a',
  edicao: '#9b8fd5',
  aguardando_cliente: '#5b9bd5',
  revisao: '#e8c547',
  aprovado: '#5db87a',
  finalizado: '#5db87a',
  pausado: '#555',
  orcamento_desaprovado: '#e85d4a',
  para_captacao: '#e8c547',
  enviado: '#5b9bd5',
  entregue: '#5db87a',
}

interface Client { id: string; name: string }
interface Freelancer { id: string; name: string; area?: string; daily_rate?: number }
interface RentalCompany { id: string; name: string }
interface CustoItem { d: string; v: number; cat?: string; freelancerId?: string }
interface PgtoItem { d: string; v: number; dt: string; rec: boolean }
interface DiariaItem { desc: string; qtd: number; v: number; rentalCompanyId?: string }
interface CostCategory { value: string; label: string }
interface FileItem { name: string; url: string; size: number; uploaded_at: string }

interface Comment {
  id: string
  userId: string
  userName: string
  text: string
  link?: string
  stage?: string
  createdAt: string
}

interface ProjectData {
  custos?: CustoItem[]
  pgtos?: PgtoItem[]
  diarias?: DiariaItem[]
  freeIds?: string[]
  dCapt?: string[]
  dCaptTimes?: string[]
  dCaptEndTimes?: string[]
  dCaptAllDay?: boolean[]
  dCaptLocais?: string[]
  margem?: number
  briefingUrl?: string
  hasNF?: boolean
  comments?: Comment[]
  contractId?: string
  isContract?: boolean      // true if this project is a monthly recurring contract
  contractDueDay?: number   // day of month for billing (1-31)
  files?: FileItem[]
}

function calcDuration(start: string, end: string): string {
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  const totalMin = (eh * 60 + em) - (sh * 60 + sm)
  if (totalMin <= 0) return ''
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ''}` : `${m}m`
}

interface Project {
  id: string
  name: string
  type?: string
  status: string
  value: number
  delivery_date?: string
  description?: string
  progress: number
  client_id?: string
  data?: ProjectData
  clients?: { name: string } | null
  created_at: string
  quote_token?: string
}

const BLANK_PROJ = (): Partial<Project> & { data: ProjectData } => ({
  name: '', type: '', status: 'orcamento', value: 0,
  delivery_date: '', description: '', progress: 0, client_id: '',
  data: { custos: [], pgtos: [], diarias: [], freeIds: [], dCapt: [], dCaptTimes: [], dCaptEndTimes: [], dCaptAllDay: [], dCaptLocais: [], margem: 0, briefingUrl: '', hasNF: false, comments: [], contractId: '', isContract: false, contractDueDay: 1 },
})

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', background: '#1a1d24',
  border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4',
  fontSize: '13px', outline: 'none', boxSizing: 'border-box',
}

const btn = (v: 'primary' | 'ghost' | 'danger' | 'green') => ({
  padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
  cursor: 'pointer',
  border: v === 'ghost' ? '1px solid #2a2a2a' : 'none',
  background: v === 'primary' ? '#e8c547' : v === 'danger' ? 'rgba(232,93,74,.12)' : v === 'green' ? '#5db87a' : 'transparent',
  color: v === 'primary' ? '#000' : v === 'danger' ? '#e85d4a' : v === 'green' ? '#000' : '#888',
  display: 'inline-flex', alignItems: 'center', gap: '6px',
} as React.CSSProperties)

function getUrgency(deliveryDate?: string): { label: string; color: string } | null {
  if (!deliveryDate) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const delivery = new Date(deliveryDate + 'T00:00:00')
  const diffDays = Math.floor((delivery.getTime() - today.getTime()) / 86400000)
  if (diffDays < 0) return { label: `🔴 ${Math.abs(diffDays)}d atrasado`, color: '#e85d4a' }
  if (diffDays === 0) return { label: '🔴 Entrega hoje!', color: '#e85d4a' }
  if (diffDays === 1) return { label: '⚡ Entrega amanhã', color: '#e8c547' }
  if (diffDays <= 5) return { label: `📅 ${diffDays} dias`, color: '#e8924a' }
  return null
}

function CommentForm({ projectId, onSubmit }: { projectId: string; onSubmit: (id: string, text: string, link?: string) => void }) {
  const [text, setText] = useState('')
  const [link, setLink] = useState('')
  const inp2: React.CSSProperties = { width: '100%', padding: '8px 12px', background: '#1a1d24', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <textarea
        style={{ ...inp2, height: '64px', resize: 'none' as const }}
        value={text} onChange={e => setText(e.target.value)}
        placeholder="Adicionar comentário, atualização ou link..."
      />
      <div style={{ display: 'flex', gap: '6px' }}>
        <input style={{ ...inp2, flex: 1 }} value={link} onChange={e => setLink(e.target.value)} placeholder="Link opcional (drive, dropbox...)" />
        <button
          onClick={() => { if (text.trim()) { onSubmit(projectId, text, link || undefined); setText(''); setLink('') } }}
          disabled={!text.trim()}
          style={{ padding: '8px 14px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontWeight: 700, fontSize: '12px', cursor: text.trim() ? 'pointer' : 'not-allowed', flexShrink: 0, opacity: text.trim() ? 1 : 0.5 }}>
          Enviar
        </button>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const autoOpenedRef = useRef(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [freelancers, setFreelancers] = useState<Freelancer[]>([])
  const [rentalCompanies, setRentalCompanies] = useState<RentalCompany[]>([])
  const [loading, setLoading] = useState(true)
  const [mainTab, setMainTab] = useState<'projetos' | 'orcamentos'>('projetos')
  const [subTab, setSubTab] = useState<string>('todos')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Project | null>(null)
  const [form, setForm] = useState<Partial<Project> & { data: ProjectData }>(BLANK_PROJ())
  const [saving, setSaving] = useState(false)
  const [formStep, setFormStep] = useState(1)
  const [viewProject, setViewProject] = useState<Project | null>(null)
  const [costCategories, setCostCategories] = useState<string[]>(['Freela', 'Transporte', 'Estacionamento', 'Alimentação', 'Equipamento', 'Locação', 'Outro'])
  const [projectTypes, setProjectTypes] = useState<string[]>(['Corporativo', 'Evento', 'Institucional', 'Casamento', 'Publicitário', 'Redes Sociais', 'Documentário', 'Making Of', 'Drone'])
  const [showAddClient, setShowAddClient] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [newClientSaving, setNewClientSaving] = useState(false)

  // Inline freelancer creation
  const [showAddFreela, setShowAddFreela] = useState(false)
  const [newFreelaForm, setNewFreelaForm] = useState({ name: '', area: '', daily_rate: 0 })
  const [newFreelaSaving, setNewFreelaSaving] = useState(false)

  // Current user for stage access
  const [currentUser, setCurrentUser] = useState<{ id: string; name?: string; role: string; company_id?: string; permissions?: { stageAccess?: string[] } } | null>(null)
  const [uploadingFile, setUploadingFile] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    const [pr, cr, fr, rc, cfg, me] = await Promise.all([
      fetch('/api/projects').then(r => r.json()),
      fetch('/api/clients').then(r => r.json()),
      fetch('/api/freelancers').then(r => r.json()),
      fetch('/api/rental-companies').then(r => r.json()).catch(() => []),
      fetch('/api/company-settings').then(r => r.json()).catch(() => ({})),
      fetch('/api/me').then(r => r.json()).catch(() => null),
    ])
    setProjects(Array.isArray(pr) ? pr : [])
    setClients(Array.isArray(cr) ? cr : [])
    setFreelancers(Array.isArray(fr) ? fr : [])
    setRentalCompanies(Array.isArray(rc) ? rc : [])
    if (cfg?.categoriasCusto?.length) setCostCategories(cfg.categoriasCusto)
    if (cfg?.tiposProjeto?.length) setProjectTypes(cfg.tiposProjeto)
    if (me?.user) setCurrentUser(me.user)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!loading && searchParams.get('new') === '1' && !autoOpenedRef.current) {
      autoOpenedRef.current = true
      openCreate()
      window.history.replaceState({}, '', '/dashboard/projects')
    }
  }, [loading, searchParams])

  function openCreate() {
    setEditing(null)
    setForm(BLANK_PROJ())
    setFormStep(1)
    setShowModal(true)
  }

  function openEdit(p: Project) {
    setEditing(p)
    setForm({
      name: p.name || '',
      type: p.type || '',
      status: p.status || 'orcamento',
      value: p.value || 0,
      delivery_date: p.delivery_date ? p.delivery_date.split('T')[0] : '',
      description: p.description || '',
      progress: p.progress || 0,
      client_id: p.client_id || '',
      data: {
        custos: p.data?.custos || [],
        pgtos: p.data?.pgtos || [],
        diarias: p.data?.diarias || [],
        freeIds: p.data?.freeIds || [],
        dCapt: (p.data?.dCapt || []).map(d => d ? d.split('T')[0] : ''),
        dCaptTimes: p.data?.dCaptTimes || [],
        dCaptEndTimes: p.data?.dCaptEndTimes || [],
        dCaptAllDay: p.data?.dCaptAllDay || [],
        dCaptLocais: p.data?.dCaptLocais || [],
        margem: p.data?.margem || 0,
        briefingUrl: p.data?.briefingUrl || '',
        hasNF: p.data?.hasNF || false,
        comments: p.data?.comments || [],
        contractId: p.data?.contractId || '',
        isContract: p.data?.isContract || false,
        contractDueDay: p.data?.contractDueDay || 1,
      },
    })
    setFormStep(1)
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.name?.trim()) { toast.show('Informe o nome do projeto', 'error'); return }
    setSaving(true)
    try {
      const url = editing ? `/api/projects/${editing.id}` : '/api/projects'
      const method = editing ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error) }
      const savedProj = await res.json()

      // Handle monthly contract
      if (form.data?.isContract) {
        const contractPayload = {
          name: form.name,
          value: Number(form.value) || 0,
          due_day: form.data?.contractDueDay || 1,
          client_id: form.client_id || null,
          project_id: savedProj.id,
          status: 'ativo',
        }
        if (form.data?.contractId) {
          // Update existing contract
          await fetch(`/api/contracts/${form.data.contractId}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contractPayload),
          })
        } else {
          // Create new contract and save its id back to project
          const contractRes = await fetch('/api/contracts', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(contractPayload),
          })
          if (contractRes.ok) {
            const contract = await contractRes.json()
            await fetch(`/api/projects/${savedProj.id}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...savedProj, data: { ...(savedProj.data || {}), contractId: contract.id, isContract: true, contractDueDay: form.data?.contractDueDay || 1 } }),
            })
          }
        }
      }

      // Detectar pagamentos recém marcados como recebidos → criar entrada no caixa
      {
        const oldPgtos = editing?.data?.pgtos || []
        const newPgtos = form.data?.pgtos || []
        const today = new Date().toISOString().split('T')[0]
        for (let i = 0; i < newPgtos.length; i++) {
          const newPg = newPgtos[i]
          const oldPg = oldPgtos[i]
          if (newPg.rec && !oldPg?.rec && Number(newPg.v) > 0) {
            const baseValue = Number(newPg.v)
            const netValue = form.data?.hasNF ? Math.round(baseValue * 0.95) : baseValue
            const taxValue = baseValue - netValue
            await fetch('/api/transactions', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ type: 'entrada', value: netValue, description: `${newPg.d || 'Pagamento'} — ${form.name}`, category: 'Projeto', transaction_date: newPg.dt || today }),
            })
            if (taxValue > 0) {
              await fetch('/api/transactions', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'saida', value: taxValue, description: `Imposto NF (5%) — ${form.name}`, category: 'Imposto', transaction_date: newPg.dt || today }),
              })
            }
          }
        }
      }

      // Sincronizar eventos do calendário para projetos ativos
      if (!['orcamento', 'orcamento_desaprovado'].includes(form.status || 'orcamento')) {
        await fetch(`/api/events?project_id=${savedProj.id}`, { method: 'DELETE' })
        const evts: object[] = []
        for (let i = 0; i < (form.data?.dCapt || []).length; i++) {
          const d = (form.data?.dCapt || [])[i]
          if (!d) continue
          const t = (form.data?.dCaptTimes || [])[i] || ''
          const et = (form.data?.dCaptEndTimes || [])[i] || ''
          evts.push({ title: `📷 ${form.name}`, event_date: d, event_time: t || null, event_type: 'capt', notes: `Projeto: ${form.name}${t && et ? ` (${t}–${et})` : ''}`, project_id: savedProj.id })
        }
        if (form.delivery_date) {
          evts.push({ title: `🎬 Entrega: ${form.name}`, event_date: form.delivery_date.split('T')[0], event_type: 'entrega', notes: `Entrega do projeto: ${form.name}`, project_id: savedProj.id })
        }
        if (evts.length > 0) {
          await Promise.all(evts.map(ev => fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(ev) })))
        }
      }

      await load()
      setShowModal(false)
      toast.show(editing ? 'Projeto atualizado!' : 'Projeto criado!', 'success')
    } catch (e: unknown) {
      toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Excluir este projeto?')) return
    await fetch(`/api/projects/${id}`, { method: 'DELETE' })
    await load()
    toast.show('Projeto excluído', 'success')
  }

  async function handleStatusChange(id: string, newStatus: string) {
    const proj = projects.find(p => p.id === id)
    if (!proj) return
    await fetch(`/api/projects/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...proj, status: newStatus }),
    })
    setProjects(ps => ps.map(p => p.id === id ? { ...p, status: newStatus } : p))
    if (viewProject?.id === id) setViewProject(v => v ? { ...v, status: newStatus } : v)
  }

  async function handleApprove(id: string) {
    const res = await fetch(`/api/projects/${id}/approve`, { method: 'POST' })
    if (!res.ok) { const e = await res.json(); toast.show('Erro ao aprovar: ' + (e.error || 'Erro'), 'error'); return }
    await load()
    toast.show('Projeto aprovado! Custos → A Pagar · Pagamentos → A Receber.', 'success')
    setMainTab('projetos')
  }

  async function handleAddClient() {
    if (!newClientName.trim()) return
    setNewClientSaving(true)
    try {
      const res = await fetch('/api/clients', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newClientName.trim() }) })
      if (!res.ok) throw new Error('Erro')
      const client = await res.json()
      setClients(cs => [...cs, client])
      upd('client_id', client.id)
      setShowAddClient(false)
      setNewClientName('')
      toast.show('Cliente criado!', 'success')
    } catch { toast.show('Erro ao criar cliente', 'error') }
    finally { setNewClientSaving(false) }
  }

  async function handleAddFreela() {
    if (!newFreelaForm.name.trim()) return
    setNewFreelaSaving(true)
    try {
      const res = await fetch('/api/freelancers', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFreelaForm.name.trim(), area: newFreelaForm.area, daily_rate: newFreelaForm.daily_rate || 0 })
      })
      if (!res.ok) throw new Error('Erro')
      const freela = await res.json()
      setFreelancers(fs => [...fs, freela])
      updData('freeIds', [...(form.data?.freeIds || []), freela.id])
      setShowAddFreela(false)
      setNewFreelaForm({ name: '', area: '', daily_rate: 0 })
      toast.show('Freelancer adicionado!', 'success')
    } catch { toast.show('Erro ao criar freelancer', 'error') }
    finally { setNewFreelaSaving(false) }
  }

  async function handleAddComment(projectId: string, text: string, link?: string) {
    if (!text.trim()) return
    const proj = projects.find(p => p.id === projectId)
    if (!proj) return
    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUser?.id || 'unknown',
      userName: currentUser?.name || currentUser?.id?.slice(0, 8) || 'Usuário',
      text: text.trim(),
      link: link?.trim() || undefined,
      stage: proj.status,
      createdAt: new Date().toISOString(),
    }
    const comments = [...(proj.data?.comments || []), newComment]
    await fetch(`/api/projects/${projectId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: { ...proj.data, comments } }),
    })
    await load()
    setViewProject(vp => vp?.id === projectId ? { ...vp, data: { ...vp.data, comments } } : vp)
    toast.show('Comentário adicionado!', 'success')
  }

  // form helpers
  const upd = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const updData = (k: string, v: unknown) => setForm(f => ({ ...f, data: { ...f.data, [k]: v } }))

  const totalCustos = (form.data?.custos || []).reduce((s, c) => s + Number(c.v || 0), 0)
  const totalDiarias = (form.data?.diarias || []).reduce((s, d) => s + (Number(d.qtd || 1) * Number(d.v || 0)), 0)
  const margem = Number(form.data?.margem || 0)
  const totalBase = totalCustos + totalDiarias
  const valorSugerido = margem > 0 && margem < 100 ? Math.round(totalBase / (1 - margem / 100)) : 0
  const totalRec = (form.data?.pgtos || []).filter(p => p.rec).reduce((s, p) => s + Number(p.v || 0), 0)
  const totalPend = (form.data?.pgtos || []).filter(p => !p.rec).reduce((s, p) => s + Number(p.v || 0), 0)

  // Toggle freelancer
  function toggleFree(id: string) {
    const ids = form.data?.freeIds || []
    updData('freeIds', ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id])
  }

  // File upload
  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !form.id) return
    const companyId = currentUser?.company_id
    if (!companyId) { toast.show('Erro: company_id não encontrado', 'error'); return }
    setUploadingFile(true)
    try {
      const supabase = createClient()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
      const path = `${companyId}/${form.id}/${Date.now()}_${safeName}`
      const { error: upErr } = await supabase.storage.from('project-files').upload(path, file, { upsert: true })
      if (upErr) throw upErr
      const { data: urlData } = supabase.storage.from('project-files').getPublicUrl(path)
      const newFile: FileItem = { name: file.name, url: urlData.publicUrl, size: file.size, uploaded_at: new Date().toISOString() }
      const newFiles = [...(form.data?.files || []), newFile]
      updData('files', newFiles)
      toast.show('Arquivo enviado!', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao enviar arquivo'
      toast.show(msg, 'error')
    } finally {
      setUploadingFile(false)
      e.target.value = ''
    }
  }

  async function handleDeleteFile(index: number) {
    const files = form.data?.files || []
    const file = files[index]
    if (!file) return
    try {
      const supabase = createClient()
      const companyId = currentUser?.company_id
      if (companyId && form.id) {
        // Extract path from URL
        const urlParts = file.url.split('/project-files/')
        if (urlParts[1]) {
          await supabase.storage.from('project-files').remove([decodeURIComponent(urlParts[1])])
        }
      }
      const newFiles = files.filter((_, i) => i !== index)
      updData('files', newFiles)
      toast.show('Arquivo removido', 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao remover arquivo'
      toast.show(msg, 'error')
    }
  }

  // Stage access filtering
  const stageAccess = currentUser?.permissions?.stageAccess
  const hasStageFilter = stageAccess && stageAccess.length > 0 && currentUser?.role !== 'admin'
  const isEditor = currentUser?.role === 'editor'

  const projetos = projects.filter(p => {
    if (['orcamento', 'orcamento_desaprovado'].includes(p.status)) return false
    if (p.status === 'finalizado' || p.status === 'entregue') return false
    if (hasStageFilter) return stageAccess!.includes(p.status)
    return true
  })

  const concluidosProjects = projects.filter(p => p.status === 'finalizado' || p.status === 'entregue')

  const orcamentos = projects.filter(p => p.status === 'orcamento')

  const STATUS_SORT: Record<string, number> = { producao: 0, para_captacao: 0, edicao: 1, aguardando_cliente: 2, revisao: 3, aprovado: 4, enviado: 4, pausado: 10 }

  const filteredProjetos = subTab === 'todos' ? projetos : projetos.filter(p => {
    if (subTab === 'producao') return p.status === 'producao' || p.status === 'para_captacao'
    if (subTab === 'aprovado') return p.status === 'aprovado' || p.status === 'enviado'
    return p.status === subTab
  })

  const sortedProjetos = [...filteredProjetos].sort((a, b) => {
    const so = (STATUS_SORT[a.status] ?? 9) - (STATUS_SORT[b.status] ?? 9)
    if (so !== 0) return so
    if (!a.delivery_date) return 1
    if (!b.delivery_date) return -1
    return a.delivery_date.split('T')[0].localeCompare(b.delivery_date.split('T')[0])
  })

  const subTabs = [
    { key: 'todos', label: `Todos (${projetos.length})` },
    { key: 'producao', label: `Produção (${projetos.filter(p => p.status === 'producao' || p.status === 'para_captacao').length})` },
    { key: 'edicao', label: `Edição (${projetos.filter(p => p.status === 'edicao').length})` },
    { key: 'aguardando_cliente', label: `Aguard. Cliente (${projetos.filter(p => p.status === 'aguardando_cliente').length})` },
    { key: 'revisao', label: `Revisão (${projetos.filter(p => p.status === 'revisao').length})` },
    { key: 'aprovado', label: `Aprovado (${projetos.filter(p => p.status === 'aprovado' || p.status === 'enviado').length})` },
    { key: 'pausado', label: `Pausado (${projetos.filter(p => p.status === 'pausado').length})` },
  ].filter(t => {
    const m = t.label.match(/\((\d+)\)/)
    return m ? parseInt(m[1]) > 0 || t.key === 'todos' : true
  })

  if (loading) return <div style={{ color: '#555', padding: '40px', textAlign: 'center' }}>Carregando...</div>

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      <style>{`.proj-card:hover { background: #161616 !important; }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>
            {mainTab === 'projetos' ? 'Projetos' : 'Orçamentos'}
          </h1>
          <p style={{ color: '#555', fontSize: '13px' }}>
            {mainTab === 'projetos' ? `${projetos.length} projeto${projetos.length !== 1 ? 's' : ''}` : `${orcamentos.length} aguardando aprovação`}
          </p>
        </div>
        <button onClick={openCreate} style={btn('primary')}>+ Novo {mainTab === 'orcamentos' ? 'Orçamento' : 'Projeto'}</button>
      </div>

      {/* Main tabs */}
      <div style={{ display: 'flex', gap: '2px', borderBottom: '1px solid #2a2a2a', marginBottom: '24px' }}>
        {(['projetos', 'orcamentos'] as const).map(t => (
          <button key={t} onClick={() => setMainTab(t)} style={{ padding: '8px 16px', fontSize: '13px', cursor: 'pointer', border: 'none', background: 'transparent', color: mainTab === t ? '#e8c547' : '#555', borderBottom: mainTab === t ? '2px solid #e8c547' : '2px solid transparent', marginBottom: '-1px', fontFamily: "'Montserrat', sans-serif", transition: 'all .12s' }}>
            {t === 'projetos' ? `Projetos (${projetos.length})` : `Orçamentos (${orcamentos.length})`}
          </button>
        ))}
      </div>

      {/* ORCAMENTOS */}
      {mainTab === 'orcamentos' && (
        <div>
          {orcamentos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>📋</div>
              <div style={{ fontSize: '15px', color: '#888', marginBottom: '6px' }}>Nenhum orçamento pendente</div>
              <div style={{ fontSize: '13px' }}>Crie um novo orçamento para um cliente</div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
              {orcamentos.map(p => (
                <div key={p.id} onClick={() => setViewProject(p)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '18px', position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: '#5b9bd5' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 600, fontSize: '14px', color: '#f0ece4', flex: 1, marginRight: '8px' }}>{p.name}</div>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '20px', background: 'rgba(91,155,213,.15)', color: '#5b9bd5', fontWeight: 600, textTransform: 'uppercase' as const, whiteSpace: 'nowrap' as const }}>Em Aprovação</span>
                  </div>
                  <div style={{ fontSize: '12px', color: '#555', marginBottom: '10px' }}>👤 {p.clients?.name || '—'}</div>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' as const, marginBottom: '12px', fontSize: '11px', color: '#555' }}>
                    {p.delivery_date && <span>📅 {fd(p.delivery_date.split('T')[0])}</span>}
                    {p.type && <span>🏷 {p.type}</span>}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{fv(p.value)}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', paddingTop: '10px', borderTop: '1px solid #1a1a1a', flexWrap: 'wrap' as const }}>
                    <button onClick={e => { e.stopPropagation(); openEdit(p) }} style={{ ...btn('ghost'), flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '12px' }}>✏️ Editar</button>
                    <button onClick={e => { e.stopPropagation(); handleApprove(p.id) }} style={{ ...btn('green'), flex: 1, justifyContent: 'center', padding: '6px 10px', fontSize: '12px' }}>✅ Aprovar</button>
                    {p.quote_token && (
                      <button onClick={e => { e.stopPropagation(); navigator.clipboard.writeText(`${window.location.origin}/orcamento/${p.quote_token}`); toast.show('Link copiado!', 'info') }}
                        style={{ ...btn('ghost'), padding: '6px 10px', fontSize: '12px' }} title="Copiar link de aprovação">🔗</button>
                    )}
                    {p.quote_token && (
                      <button onClick={e => { e.stopPropagation(); window.open(`/orcamento/${p.quote_token}`, '_blank') }}
                        style={{ ...btn('ghost'), padding: '6px 10px', fontSize: '12px' }} title="Ver e imprimir PDF">📄</button>
                    )}
                    <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} style={{ ...btn('danger'), padding: '6px 10px', fontSize: '12px' }}>🗑</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* PROJETOS */}
      {mainTab === 'projetos' && (
        <div>
          {/* Sub-tabs */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '20px' }}>
            {subTabs.map(t => (
              <button key={t.key} onClick={() => setSubTab(t.key)}
                style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: subTab === t.key ? 'rgba(232,197,71,.15)' : '#1a1d24', color: subTab === t.key ? '#e8c547' : '#555', transition: 'all .12s' }}>
                {t.label}
              </button>
            ))}
          </div>

          {sortedProjetos.length === 0 ? (
            !loading && projects.filter(p => !['orcamento', 'orcamento_desaprovado', 'finalizado', 'entregue'].includes(p.status)).length === 0 && subTab === 'todos' ? (
              <EmptyState
                icon="🎬"
                title="Nenhum projeto ainda"
                subtitle="Adicione seu primeiro projeto para começar."
                action="+ Novo Projeto"
                onAction={() => { setMainTab('projetos'); openCreate() }}
              />
            ) : (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#555' }}>
                <div style={{ fontSize: '36px', marginBottom: '12px' }}>🎬</div>
                <div style={{ fontSize: '15px', color: '#888', marginBottom: '6px' }}>Nenhum projeto aqui</div>
                <div style={{ fontSize: '13px' }}>Aprove um orçamento para iniciar um projeto</div>
              </div>
            )
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px' }}>
              {sortedProjetos.map(p => {
                const urgency = getUrgency(p.delivery_date ? p.delivery_date.split('T')[0] : undefined)
                const statusColor = ST_COLOR[p.status] || '#555'
                return (
                  <div key={p.id} className="proj-card" onClick={() => setViewProject(p)} style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px', cursor: 'pointer', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* color bar top */}
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: statusColor }} />
                    {/* Status + urgency */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px', paddingTop: '2px' }}>
                      <span style={{ fontSize: '10px', padding: '2px 7px', borderRadius: '4px', background: statusColor + '22', color: statusColor, fontWeight: 600 }}>{ST_LABEL[p.status] || p.status}</span>
                      {urgency && <span style={{ fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px', background: urgency.color + '22', color: urgency.color, whiteSpace: 'nowrap' as const }}>{urgency.label}</span>}
                    </div>
                    {/* Name */}
                    <div style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#f0ece4', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>{p.name}</div>
                    {/* Meta */}
                    <div style={{ fontSize: '11px', color: '#555', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {p.clients?.name && <span>👤 {p.clients.name}</span>}
                      {p.delivery_date && <span>📅 {fd(p.delivery_date.split('T')[0])}</span>}
                      {p.type && <span>🏷 {p.type}</span>}
                    </div>
                    {/* Footer: value + actions */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto', paddingTop: '6px', borderTop: '1px solid #1a1a1a' }}>
                      {!isEditor && <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '13px', color: '#f0ece4' }}>{fv(p.value)}</span>}
                      {isEditor && <span />}
                      <div style={{ display: 'flex', gap: '4px' }} onClick={e => e.stopPropagation()}>
                        {(p.data?.comments?.length || 0) > 0 && <span style={{ fontSize: '10px', color: '#e8c547', padding: '2px 6px', borderRadius: '4px', background: 'rgba(232,197,71,.1)' }}>💬 {p.data!.comments!.length}</span>}
                        {(() => {
                          const pipeIdx = (PIPELINE as readonly string[]).indexOf(p.status)
                          const nextSt = pipeIdx >= 0 && pipeIdx < PIPELINE.length - 1 ? PIPELINE[pipeIdx + 1] : null
                          return nextSt ? (
                            <button onClick={() => handleStatusChange(p.id, nextSt)}
                              style={{ background: (ST_COLOR[nextSt] || '#555') + '22', border: 'none', color: ST_COLOR[nextSt] || '#f0ece4', padding: '3px 7px', borderRadius: '5px', fontSize: '10px', fontWeight: 600, cursor: 'pointer' }}>
                              →
                            </button>
                          ) : null
                        })()}
                        <button onClick={() => openEdit(p)} style={{ ...btn('ghost'), padding: '3px 7px', fontSize: '11px' }}>✏️</button>
                        <button onClick={() => handleDelete(p.id)} style={{ ...btn('danger'), padding: '3px 7px', fontSize: '11px' }}>🗑</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Concluídos */}
          {concluidosProjects.length > 0 && (
            <div style={{ marginTop: '32px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                <div style={{ height: '1px', flex: 1, background: '#1a1d24' }} />
                <span style={{ fontSize: '12px', color: '#555', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '1px' }}>✅ Concluídos ({concluidosProjects.length})</span>
                <div style={{ height: '1px', flex: 1, background: '#1a1d24' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {concluidosProjects.map(p => {
                  const rec = (p.data?.pgtos || []).filter(x => x.rec).reduce((s, x) => s + Number(x.v || 0), 0)
                  return (
                    <div key={p.id} onClick={() => setViewProject(p)} style={{ background: '#111', border: '1px solid #1e1e1e', borderRadius: '8px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', opacity: 0.7 }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#5db87a', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '13px', color: '#d1d5db', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{p.name}</div>
                        <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{p.clients?.name || '—'}{p.delivery_date ? ` · ${fd(p.delivery_date.split('T')[0])}` : ''}</div>
                      </div>
                      {!isEditor && <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '14px', color: '#5db87a', flexShrink: 0 }}>{fv(rec)}</span>}
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button onClick={e => { e.stopPropagation(); openEdit(p) }} style={{ ...btn('ghost'), padding: '4px 8px', fontSize: '11px' }}>✏️</button>
                        <button onClick={e => { e.stopPropagation(); handleDelete(p.id) }} style={{ ...btn('danger'), padding: '4px 8px', fontSize: '11px' }}>🗑</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL CREATE/EDIT */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', width: '100%', maxWidth: '680px', maxHeight: '92vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
            {/* Modal header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>{editing ? 'Editar Projeto' : 'Novo Projeto / Orçamento'}</h3>
                <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
              </div>
              {/* Step indicator */}
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[
                  { n: 1, label: 'Básico' },
                  { n: 2, label: 'Detalhes' },
                  { n: 3, label: 'Custos' },
                  { n: 4, label: 'Financeiro' },
                ].map((s, i) => (
                  <>
                    <div
                      key={s.n}
                      onClick={() => setFormStep(s.n)}
                      style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', opacity: formStep === s.n ? 1 : 0.5 }}
                    >
                      <div style={{
                        width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: formStep > s.n ? '#5db87a' : formStep === s.n ? '#e8c547' : '#2a2a2a',
                        color: formStep >= s.n ? '#000' : '#555', fontSize: '11px', fontWeight: 700, flexShrink: 0,
                      }}>{formStep > s.n ? '✓' : s.n}</div>
                      <span style={{ fontSize: '11px', fontWeight: formStep === s.n ? 600 : 400, color: formStep === s.n ? '#e8c547' : '#555' }}>{s.label}</span>
                    </div>
                    {i < 3 && <div key={`sep-${i}`} style={{ flex: 1, height: '1px', background: formStep > s.n ? '#5db87a' : '#2a2a2a', maxWidth: '24px' }} />}
                  </>
                ))}
              </div>
            </div>

            <div style={{ padding: '24px', flex: 1 }}>

              {/* ── Step 1: Básico ─────────────────────────────────── */}
              {formStep === 1 && (
                <>
                  {/* Row 1: name + client */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Nome do Projeto *</label>
                      <input style={inp} value={form.name || ''} onChange={e => upd('name', e.target.value)} placeholder="Vídeo institucional..." />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Cliente</label>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <select style={{ ...inp, flex: 1 }} value={form.client_id || ''} onChange={e => upd('client_id', e.target.value)}>
                          <option value="">Selecionar...</option>
                          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setShowAddClient(s => !s)} style={{ ...btn('ghost'), padding: '8px 12px', flexShrink: 0, fontWeight: 700, fontSize: '16px' }} title="Novo cliente">+</button>
                      </div>
                      {showAddClient && (
                        <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                          <input autoFocus style={{ ...inp, flex: 1 }} value={newClientName} onChange={e => setNewClientName(e.target.value)} placeholder="Nome do cliente..." onKeyDown={e => e.key === 'Enter' && handleAddClient()} />
                          <button type="button" onClick={handleAddClient} disabled={newClientSaving} style={{ ...btn('primary'), padding: '8px 12px', flexShrink: 0 }}>{newClientSaving ? '...' : '✓'}</button>
                          <button type="button" onClick={() => { setShowAddClient(false); setNewClientName('') }} style={{ ...btn('ghost'), padding: '8px 12px', flexShrink: 0 }}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Row 2: type + status */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Tipo</label>
                      <select style={{ ...inp }} value={form.type || ''} onChange={e => upd('type', e.target.value)}>
                        <option value="">Selecionar tipo...</option>
                        {projectTypes.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Status</label>
                      <select style={inp} value={form.status || 'orcamento'} onChange={e => upd('status', e.target.value)}>
                        <option value="orcamento">Orçamento</option>
                        <option value="producao">Em Produção</option>
                        <option value="edicao">Edição</option>
                        <option value="aguardando_cliente">Aguardando Cliente</option>
                        <option value="revisao">Revisão</option>
                        <option value="aprovado">Aprovado</option>
                        <option value="finalizado">Finalizado</option>
                        <option value="pausado">Pausado</option>
                        <option value="orcamento_desaprovado">Reprovado</option>
                      </select>
                    </div>
                  </div>

                  {/* Delivery date + progress */}
                  <div style={{ display: 'grid', gridTemplateColumns: editing ? '1fr 1fr' : '1fr', gap: '12px', marginBottom: '12px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Data de Entrega</label>
                      <input type="date" style={inp} value={form.delivery_date || ''} onChange={e => upd('delivery_date', e.target.value)} />
                    </div>
                    {editing && (
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Progresso (%)</label>
                        <input type="number" style={inp} value={form.progress || 0} onChange={e => upd('progress', Number(e.target.value))} min={0} max={100} />
                      </div>
                    )}
                  </div>

                  {/* Monthly contract toggle */}
                  <div style={{ marginBottom: '4px', padding: '12px 14px', background: form.data?.isContract ? 'rgba(91,155,213,.1)' : 'rgba(255,255,255,.03)', border: `1px solid ${form.data?.isContract ? 'rgba(91,155,213,.3)' : '#2a2a2a'}`, borderRadius: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input
                        type="checkbox"
                        id="isContract"
                        checked={form.data?.isContract || false}
                        onChange={e => updData('isContract', e.target.checked)}
                        style={{ accentColor: '#5b9bd5', width: '16px', height: '16px', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <label htmlFor="isContract" style={{ fontSize: '13px', color: '#f0ece4', cursor: 'pointer', fontWeight: 600 }}>
                        📅 Contrato recorrente mensal
                      </label>
                      <span style={{ fontSize: '11px', color: '#6b7280' }}>— cobrança gerada todo mês no Financeiro</span>
                    </div>
                    {form.data?.isContract && (
                      <div style={{ marginTop: '10px', marginLeft: '26px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div>
                          <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '5px' }}>Dia de vencimento</label>
                          <input
                            type="number"
                            style={{ ...inp, width: '80px' }}
                            value={form.data?.contractDueDay || 1}
                            onChange={e => updData('contractDueDay', Math.max(1, Math.min(31, Number(e.target.value))))}
                            min={1} max={31}
                            placeholder="5"
                          />
                        </div>
                        <div style={{ fontSize: '12px', color: '#5b9bd5' }}>
                          Toda cobrança mensal aparecerá na área <strong>Contratos Fixos</strong> do Financeiro.
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* ── Step 2: Detalhes ───────────────────────────────── */}
              {formStep === 2 && (
                <>
                  {/* Briefing */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Briefing</label>
                    <textarea style={{ ...inp, height: '80px', resize: 'vertical' }} value={form.description || ''} onChange={e => upd('description', e.target.value)} placeholder="Descreva o projeto, referências, observações..." />
                  </div>

                  {/* Briefing URL */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Link do Briefing / Anexo</label>
                    <input style={inp} value={form.data?.briefingUrl || ''} onChange={e => updData('briefingUrl', e.target.value)} placeholder="https://drive.google.com/... ou outro link" />
                  </div>

                  {/* File Upload */}
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Arquivos do Projeto</label>
                    {!form.id ? (
                      <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic' as const }}>Salve o projeto primeiro para anexar arquivos.</p>
                    ) : (
                      <>
                        <label style={{ display: 'block', cursor: uploadingFile ? 'not-allowed' : 'pointer' }}>
                          <div style={{ ...inp, display: 'flex', alignItems: 'center', gap: '8px', cursor: uploadingFile ? 'not-allowed' : 'pointer', color: uploadingFile ? '#555' : '#888', fontSize: '12px' }}>
                            {uploadingFile ? '⏳ Enviando...' : '📎 Clique para selecionar arquivo'}
                          </div>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip"
                            onChange={handleFileUpload}
                            disabled={uploadingFile}
                            style={{ display: 'none' }}
                          />
                        </label>
                        {(form.data?.files || []).length > 0 && (
                          <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
                            {(form.data?.files || []).map((f, i) => (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '8px 12px' }}>
                                <span style={{ fontSize: '16px' }}>📄</span>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', fontSize: '13px', color: '#e8c547', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{f.name}</a>
                                  <span style={{ fontSize: '11px', color: '#555' }}>{f.size < 1024 * 1024 ? `${(f.size / 1024).toFixed(1)} KB` : `${(f.size / (1024 * 1024)).toFixed(1)} MB`}</span>
                                </div>
                                <button type="button" onClick={() => handleDeleteFile(i)} style={{ ...btn('danger'), padding: '3px 8px', fontSize: '11px' }}>✕</button>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Freelancers */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px' }}>Freelancers</label>
                      <button type="button" onClick={() => setShowAddFreela(s => !s)} style={{ ...btn('ghost'), padding: '3px 8px', fontSize: '11px' }}>+ Novo Freela</button>
                    </div>
                    {freelancers.length > 0 && (
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' as const, marginBottom: '8px' }}>
                        {freelancers.map(f => {
                          const sel = (form.data?.freeIds || []).includes(f.id)
                          return (
                            <button key={f.id} onClick={() => toggleFree(f.id)}
                              style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 500, cursor: 'pointer', border: 'none', background: sel ? 'rgba(232,197,71,.2)' : '#1a1d24', color: sel ? '#e8c547' : '#555' }}>
                              {f.name}{f.area ? ` · ${f.area}` : ''}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {showAddFreela && (
                      <div style={{ background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px', marginTop: '8px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '4px' }}>Nome *</label>
                            <input autoFocus style={inp} value={newFreelaForm.name} onChange={e => setNewFreelaForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome do freela..." />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '4px' }}>Área</label>
                            <input style={inp} value={newFreelaForm.area} onChange={e => setNewFreelaForm(f => ({ ...f, area: e.target.value }))} placeholder="Câmera, Edição..." />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '4px' }}>Diária R$</label>
                            <input type="number" style={inp} value={newFreelaForm.daily_rate || ''} onChange={e => setNewFreelaForm(f => ({ ...f, daily_rate: Number(e.target.value) }))} placeholder="0" min={0} />
                          </div>
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button type="button" onClick={handleAddFreela} disabled={newFreelaSaving} style={{ ...btn('primary'), padding: '8px 10px' }}>{newFreelaSaving ? '...' : '✓'}</button>
                            <button type="button" onClick={() => { setShowAddFreela(false); setNewFreelaForm({ name: '', area: '', daily_rate: 0 }) }} style={{ ...btn('ghost'), padding: '8px 10px' }}>✕</button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Capture dates */}
                  <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>📅 Datas de Captação</span>
                      <button onClick={() => { updData('dCapt', [...(form.data?.dCapt || []), '']); updData('dCaptTimes', [...(form.data?.dCaptTimes || []), '']); updData('dCaptEndTimes', [...(form.data?.dCaptEndTimes || []), '']); updData('dCaptAllDay', [...(form.data?.dCaptAllDay || []), false]); updData('dCaptLocais', [...(form.data?.dCaptLocais || []), '']) }} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                    </div>
                    {(form.data?.dCapt || []).map((d, i) => {
                      const allDay = (form.data?.dCaptAllDay || [])[i] || false
                      const startTime = (form.data?.dCaptTimes || [])[i] || ''
                      const endTime = (form.data?.dCaptEndTimes || [])[i] || ''
                      const duration = !allDay && startTime && endTime ? calcDuration(startTime, endTime) : ''
                      return (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px', padding: '10px', background: '#0d0f12', borderRadius: '8px', border: '1px solid #1a1a1a' }}>
                          {/* Row 1: date + allday checkbox + remove */}
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <input type="date" style={{ ...inp, flex: 2 }} value={d} onChange={e => { const arr = [...(form.data?.dCapt || [])]; arr[i] = e.target.value; updData('dCapt', arr) }} />
                            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#888', cursor: 'pointer', whiteSpace: 'nowrap' as const, flexShrink: 0 }}>
                              <input type="checkbox" checked={allDay} onChange={e => { const arr = [...(form.data?.dCaptAllDay || Array((form.data?.dCapt || []).length).fill(false))]; arr[i] = e.target.checked; updData('dCaptAllDay', arr) }} style={{ accentColor: '#e8c547', width: '14px', height: '14px', cursor: 'pointer' }} />
                              ☀️ Dia inteiro
                            </label>
                            <button onClick={() => { const dates = [...(form.data?.dCapt || [])]; const times = [...(form.data?.dCaptTimes || [])]; const endTimes = [...(form.data?.dCaptEndTimes || [])]; const allDays = [...(form.data?.dCaptAllDay || [])]; const locais = [...(form.data?.dCaptLocais || [])]; dates.splice(i, 1); times.splice(i, 1); endTimes.splice(i, 1); allDays.splice(i, 1); locais.splice(i, 1); updData('dCapt', dates); updData('dCaptTimes', times); updData('dCaptEndTimes', endTimes); updData('dCaptAllDay', allDays); updData('dCaptLocais', locais) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                          </div>
                          {/* Row 2: start time + end time + duration (hidden when allDay) */}
                          {!allDay && (
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '3px' }}>Início</label>
                                <input type="time" style={inp} value={startTime} onChange={e => { const arr = [...(form.data?.dCaptTimes || Array((form.data?.dCapt || []).length).fill(''))]; arr[i] = e.target.value; updData('dCaptTimes', arr) }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '10px', color: '#555', marginBottom: '3px' }}>Fim</label>
                                <input type="time" style={inp} value={endTime} onChange={e => { const arr = [...(form.data?.dCaptEndTimes || Array((form.data?.dCapt || []).length).fill(''))]; arr[i] = e.target.value; updData('dCaptEndTimes', arr) }} />
                              </div>
                              {duration && (
                                <div style={{ flexShrink: 0, fontSize: '12px', color: '#e8c547', fontWeight: 600, paddingTop: '16px' }}>
                                  ⏱ {duration}
                                </div>
                              )}
                            </div>
                          )}
                          {/* Row 3: location */}
                          <input style={{ ...inp, fontSize: '12px' }} value={(form.data?.dCaptLocais || [])[i] || ''} onChange={e => { const arr = [...(form.data?.dCaptLocais || Array((form.data?.dCapt || []).length).fill(''))]; arr[i] = e.target.value; updData('dCaptLocais', arr) }} placeholder="📍 Local (opcional)" />
                        </div>
                      )
                    })}
                  </div>
                </>
              )}

              {/* ── Step 3: Custos ─────────────────────────────────── */}
              {formStep === 3 && (
                <>
                  {/* Costs */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>🧮 Custos</span>
                      <button onClick={() => updData('custos', [...(form.data?.custos || []), { d: '', v: 0 }])} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                    </div>
                    {(form.data?.custos || []).map((c, i) => (
                      <div key={i} style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px', marginBottom: c.cat === 'Freela' ? '4px' : '0' }}>
                          <select style={{ ...inp, flex: '0 0 130px' as unknown as number }} value={c.cat || ''} onChange={e => { const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], cat: e.target.value, freelancerId: '' }; updData('custos', arr) }}>
                            <option value="">Categoria</option>
                            {costCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          </select>
                          {c.cat !== 'Freela' && (
                            <input style={{ ...inp, flex: 2 }} value={c.d} onChange={e => { const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], d: e.target.value }; updData('custos', arr) }} placeholder="Descrição..." />
                          )}
                          {c.cat === 'Freela' && (
                            <select style={{ ...inp, flex: 2, color: c.freelancerId ? '#f0ece4' : '#555' }} value={c.freelancerId || ''} onChange={e => { const fl = freelancers.find(f => f.id === e.target.value); const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], freelancerId: e.target.value, d: fl?.name || '' }; updData('custos', arr) }}>
                              <option value="">Selecionar Freela...</option>
                              {freelancers.map(f => <option key={f.id} value={f.id}>{f.name}{f.area ? ` · ${f.area}` : ''}</option>)}
                            </select>
                          )}
                          <input type="number" style={{ ...inp, flex: 1, minWidth: '80px' }} value={c.v || ''} onChange={e => { const arr = [...(form.data?.custos || [])]; arr[i] = { ...arr[i], v: Number(e.target.value) || 0 }; updData('custos', arr) }} placeholder="R$" />
                          <button onClick={() => { const arr = [...(form.data?.custos || [])]; arr.splice(i, 1); updData('custos', arr) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                        </div>
                        {c.cat === 'Freela' && c.freelancerId && (
                          <div style={{ fontSize: '11px', color: '#555', paddingLeft: '4px' }}>
                            💡 O valor será vinculado ao freelancer no contas a pagar ao aprovar
                          </div>
                        )}
                      </div>
                    ))}
                    {(form.data?.custos || []).length > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>Total custos: <strong style={{ color: '#f0ece4' }}>{fv(totalCustos)}</strong></div>}
                  </div>

                  {/* Diárias */}
                  <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>🎬 Diárias e Locações</span>
                      <button onClick={() => updData('diarias', [...(form.data?.diarias || []), { desc: '', qtd: 1, v: 0 }])} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                    </div>
                    {(form.data?.diarias || []).map((d, i) => (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '10px' }}>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <input style={{ ...inp, flex: 2 }} value={d.desc} onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], desc: e.target.value }; updData('diarias', arr) }} placeholder="Câmera, drone, espaço..." />
                          <input type="number" style={{ ...inp, flex: '0 0 60px' as unknown as number, minWidth: '60px' }} value={d.qtd || 1} min={1} onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], qtd: Number(e.target.value) || 1 }; updData('diarias', arr) }} title="Qtd dias" />
                          <input type="number" style={{ ...inp, flex: 1, minWidth: '80px' }} value={d.v || ''} onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], v: Number(e.target.value) || 0 }; updData('diarias', arr) }} placeholder="R$/dia" />
                          <span style={{ fontSize: '11px', color: '#e8c547', whiteSpace: 'nowrap' as const }}>{fv((d.qtd || 1) * Number(d.v || 0))}</span>
                          <button onClick={() => { const arr = [...(form.data?.diarias || [])]; arr.splice(i, 1); updData('diarias', arr) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                        </div>
                        {rentalCompanies.length > 0 && (
                          <select
                            style={{ ...inp, fontSize: '12px', color: d.rentalCompanyId ? '#f0ece4' : '#555' }}
                            value={d.rentalCompanyId || ''}
                            onChange={e => { const arr = [...(form.data?.diarias || [])]; arr[i] = { ...arr[i], rentalCompanyId: e.target.value }; updData('diarias', arr) }}
                          >
                            <option value="">🏢 Empresa de locação (opcional)</option>
                            {rentalCompanies.map(rc => (
                              <option key={rc.id} value={rc.id}>{rc.name}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    ))}
                    {(form.data?.diarias || []).length > 0 && <div style={{ textAlign: 'right', fontSize: '12px', color: '#888' }}>Total diárias: <strong style={{ color: '#f0ece4' }}>{fv(totalDiarias)}</strong></div>}
                  </div>
                </>
              )}

              {/* ── Step 4: Financeiro ─────────────────────────────── */}
              {formStep === 4 && (
                <>
                  {/* Margin + value */}
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ background: '#0d0f12', borderRadius: '8px', padding: '12px', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888' }}>
                      <span>Custos: <strong style={{ color: '#e85d4a' }}>{fv(totalCustos)}</strong></span>
                      <span>Diárias: <strong style={{ color: '#e8924a' }}>{fv(totalDiarias)}</strong></span>
                      <span>Total base: <strong style={{ color: '#f0ece4' }}>{fv(totalBase)}</strong></span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Margem (%)</label>
                        <input type="number" style={inp} value={form.data?.margem || ''} onChange={e => updData('margem', Number(e.target.value))} placeholder="Ex: 40" min={0} max={99} />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor sugerido</label>
                        <input style={{ ...inp, color: '#e8c547' }} value={valorSugerido > 0 ? fv(valorSugerido) : ''} readOnly placeholder="—" />
                      </div>
                      <div>
                        <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase' as const, letterSpacing: '1px', marginBottom: '6px' }}>Valor final (R$) *</label>
                        <input type="number" style={inp} value={form.value || ''} onChange={e => upd('value', Number(e.target.value))} placeholder="0" />
                      </div>
                    </div>
                    {/* NF checkbox */}
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <input type="checkbox" id="hasNF" checked={form.data?.hasNF || false}
                        onChange={e => updData('hasNF', e.target.checked)}
                        style={{ accentColor: '#e8c547', width: '14px', height: '14px', cursor: 'pointer' }} />
                      <label htmlFor="hasNF" style={{ fontSize: '12px', color: '#888', cursor: 'pointer' }}>
                        🧾 Tem Nota Fiscal (5% de imposto sobre recebimentos)
                      </label>
                    </div>
                  </div>

                  {/* Payments */}
                  {!form.data?.isContract && (
                    <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: '16px', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#888' }}>💰 Recebimentos</span>
                        <button onClick={() => updData('pgtos', [...(form.data?.pgtos || []), { d: '', v: 0, dt: '', rec: false }])} style={{ ...btn('ghost'), padding: '4px 10px', fontSize: '11px' }}>+ Adicionar</button>
                      </div>
                      {(form.data?.pgtos || []).map((p, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center', flexWrap: 'wrap' as const }}>
                          <input style={{ ...inp, flex: '2 1 120px' as unknown as number }} value={p.d} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], d: e.target.value }; updData('pgtos', arr) }} placeholder="Sinal 50%..." />
                          <input type="number" style={{ ...inp, flex: '1 1 80px' as unknown as number, minWidth: '80px' }} value={p.v || ''} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], v: Number(e.target.value) || 0 }; updData('pgtos', arr) }} placeholder="R$" />
                          <input type="date" style={{ ...inp, flex: '1 1 120px' as unknown as number, minWidth: '110px' }} value={p.dt} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], dt: e.target.value }; updData('pgtos', arr) }} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#888', cursor: 'pointer', whiteSpace: 'nowrap' as const }}>
                            <input type="checkbox" checked={p.rec} onChange={e => { const arr = [...(form.data?.pgtos || [])]; arr[i] = { ...arr[i], rec: e.target.checked }; updData('pgtos', arr) }} style={{ accentColor: '#5db87a' }} /> Recebido
                          </label>
                          <button onClick={() => { const arr = [...(form.data?.pgtos || [])]; arr.splice(i, 1); updData('pgtos', arr) }} style={{ ...btn('danger'), padding: '4px 10px' }}>✕</button>
                        </div>
                      ))}
                      {(form.data?.pgtos || []).length > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginTop: '6px' }}>
                          <span>Recebido: <strong style={{ color: '#5db87a' }}>{fv(totalRec)}</strong></span>
                          <span>A receber: <strong style={{ color: '#e8924a' }}>{fv(totalPend)}</strong></span>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>

            {/* Modal footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', bottom: 0, background: '#111' }}>
              <button onClick={() => { if (formStep > 1) setFormStep(s => s - 1); else setShowModal(false) }} style={btn('ghost')}>
                {formStep > 1 ? '← Voltar' : 'Cancelar'}
              </button>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', color: '#555' }}>Etapa {formStep} de 4</span>
                {!editing && (
                  <button onClick={async () => { if (!form.name?.trim()) { toast.show('Informe o nome do projeto', 'error'); return }; setSaving(true); try { const res = await fetch('/api/projects', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, status: 'orcamento' }) }); if (!res.ok) { const e = await res.json(); throw new Error(e.error) }; await load(); setShowModal(false); toast.show('Rascunho salvo!', 'success') } catch (e: unknown) { toast.show('Erro: ' + (e instanceof Error ? e.message : 'Erro'), 'error') } finally { setSaving(false) } }} disabled={saving} style={{ ...btn('ghost'), borderColor: '#e8c547', color: '#e8c547' }}>
                    💾 Rascunho
                  </button>
                )}
                {formStep < 4 ? (
                  <>
                    <button onClick={() => { if (formStep === 1 && !form.name?.trim()) { return } setFormStep(s => s + 1) }} style={btn('primary')}>Avançar →</button>
                    {editing && (
                      <button onClick={handleSave} disabled={saving} style={btn('ghost')}>
                        {saving ? 'Salvando...' : '💾 Salvar'}
                      </button>
                    )}
                  </>
                ) : (
                  <button onClick={handleSave} disabled={saving} style={btn('primary')}>{saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Criar projeto'}</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PROJECT DETAIL MODAL */}
      {viewProject && (() => {
        const p = viewProject
        const st = { label: ST_LABEL[p.status] || p.status, color: ST_COLOR[p.status] || '#555' }
        const recebido = (p.data?.pgtos || []).filter(pg => pg.rec).reduce((s, pg) => s + Number(pg.v || 0), 0)
        const pendingPgtos = (p.data?.pgtos || []).filter(pg => !pg.rec).reduce((s, pg) => s + Number(pg.v || 0), 0)
        const aReceber = pendingPgtos > 0 ? pendingPgtos : Math.max(0, Number(p.value || 0) - recebido)
        const custoTotal = (p.data?.custos || []).reduce((s, c) => s + Number(c.v || 0), 0)
        const diariasTotal = (p.data?.diarias || []).reduce((s, d) => s + (Number(d.qtd || 1) * Number(d.v || 0)), 0)
        const totalCustosView = custoTotal + diariasTotal
        const freeNames = (p.data?.freeIds || []).map(id => freelancers.find(f => f.id === id)?.name).filter(Boolean)
        const captDates = (p.data?.dCapt || []).filter(Boolean)

        return (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.75)', padding: '20px' }}
            onClick={() => setViewProject(null)}>
            <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '14px', width: '100%', maxWidth: '760px', maxHeight: '92vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}>

              {/* Header */}
              <div style={{ padding: '22px 28px 16px', borderBottom: '1px solid #1e1e1e' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '20px', fontWeight: 700, color: '#f0ece4', margin: 0 }}>{p.name}</h2>
                  <button onClick={() => setViewProject(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '22px', lineHeight: 1, padding: '0 0 0 12px' }}>×</button>
                </div>
                {/* Status tags row */}
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const, alignItems: 'center', fontSize: '13px' }}>
                  <span style={{ padding: '3px 10px', borderRadius: '6px', background: st.color + '28', color: st.color, fontWeight: 700, fontSize: '11px', letterSpacing: '.5px', textTransform: 'uppercase' as const }}>{st.label}</span>
                  {p.type && <span style={{ color: '#888' }}>{p.type}</span>}
                  {p.clients?.name && <span style={{ color: '#888' }}>👤 {p.clients.name}</span>}
                  {p.delivery_date && <span style={{ color: '#888' }}>📅 Entrega {fd(p.delivery_date.split('T')[0])}</span>}
                  {p.status !== 'orcamento' && <span style={{ color: '#5db87a', fontWeight: 600, fontSize: '12px' }}>✅ Aprovado pelo cliente</span>}
                  {p.data?.hasNF && <span style={{ color: '#e8c547', fontSize: '11px' }}>🧾 NF</span>}
                  {p.data?.isContract && (
                    <span style={{ color: '#5b9bd5', fontSize: '11px', padding: '2px 8px', background: 'rgba(91,155,213,.15)', border: '1px solid rgba(91,155,213,.3)', borderRadius: '20px' }}>
                      🔁 Contrato Mensal
                    </span>
                  )}
                </div>
              </div>

              {/* Scrollable body */}
              <div style={{ overflowY: 'auto', flex: 1, padding: '22px 28px', display: 'flex', flexDirection: 'column', gap: '22px' }}>

                {/* KPI Cards — oculto para editor */}
                {!isEditor && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                    {[
                      { label: 'VALOR DO PROJETO', value: fv(p.value), color: '#f0ece4' },
                      { label: 'RECEBIDO', value: fv(recebido), color: '#5db87a' },
                      { label: 'A RECEBER', value: fv(aReceber), color: aReceber > 0 ? '#e8924a' : '#555' },
                    ].map(k => (
                      <div key={k.label} style={{ border: '1px solid #2a2a2a', borderRadius: '10px', padding: '14px 16px' }}>
                        <div style={{ fontSize: '10px', color: '#555', fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '1.5px', marginBottom: '8px' }}>{k.label}</div>
                        <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '22px', fontWeight: 700, color: k.color }}>{k.value}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Progress */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                    <span>Progresso</span>
                    <span style={{ color: '#e8c547', fontWeight: 600 }}>{p.progress || 0}%</span>
                  </div>
                  <div style={{ height: '6px', background: '#222', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${p.progress || 0}%`, background: '#e8c547', borderRadius: '3px' }} />
                  </div>
                </div>

                {/* Captações + Freelancers */}
                {(captDates.length > 0 || freeNames.length > 0) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {captDates.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#d1d5db' }}>
                        <span style={{ marginRight: '6px' }}>📷</span>
                        <span style={{ color: '#888' }}>Captações: </span>
                        {captDates.map((d, i) => {
                          const t = (p.data?.dCaptTimes || [])[i]
                          return (fd(d.split('T')[0]) + (t ? ` ${t}` : ''))
                        }).join(' · ')}
                      </div>
                    )}
                    {freeNames.length > 0 && (
                      <div style={{ fontSize: '13px', color: '#d1d5db' }}>
                        <span style={{ marginRight: '6px' }}>👥</span>
                        <span style={{ color: '#888' }}>Freelancers: </span>
                        {freeNames.join(', ')}
                      </div>
                    )}
                  </div>
                )}

                {/* Briefing */}
                {p.description && (
                  <div style={{ border: '1px solid #2a2a2a', borderRadius: '8px', padding: '14px 16px', fontSize: '13px', color: '#888', lineHeight: 1.6 }}>
                    {p.description}
                  </div>
                )}

                {/* Briefing link */}
                {p.data?.briefingUrl && (
                  <a href={p.data.briefingUrl} target="_blank" rel="noreferrer"
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#1a1d24', border: '1px solid #2a2a2a', borderRadius: '8px', color: '#5b9bd5', fontSize: '13px', textDecoration: 'none' }}>
                    📎 Ver briefing / anexo →
                  </a>
                )}

                {/* Custos de produção */}
                {totalCustosView > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>🎬</span> Custos de produção
                    </div>
                    <div style={{ border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden' }}>
                      {(p.data?.custos || []).map((c, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                          <span style={{ color: '#d1d5db' }}>{c.cat ? <span style={{ color: '#555', fontSize: '11px', marginRight: '6px' }}>[{c.cat}]</span> : null}{c.d}</span>
                          <span style={{ color: '#f0ece4', fontWeight: 500 }}>{fv(Number(c.v || 0))}</span>
                        </div>
                      ))}
                      {(p.data?.diarias || []).map((d, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 16px', borderBottom: '1px solid #1a1a1a', fontSize: '13px' }}>
                          <span style={{ color: '#d1d5db' }}>{d.desc}{d.qtd > 1 ? ` ×${d.qtd}` : ''}{d.rentalCompanyId ? <span style={{ color: '#555', fontSize: '11px', marginLeft: '6px' }}>({rentalCompanies.find(r => r.id === d.rentalCompanyId)?.name || ''})</span> : null}</span>
                          <span style={{ color: '#f0ece4', fontWeight: 500 }}>{fv(Number(d.qtd || 1) * Number(d.v || 0))}</span>
                        </div>
                      ))}
                      <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', fontSize: '13px', fontWeight: 700, background: '#0d0f12' }}>
                        <span style={{ color: '#f0ece4' }}>Total</span>
                        <span style={{ color: '#f0ece4' }}>{fv(totalCustosView)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Recebimentos */}
                {(p.data?.pgtos || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span>💰</span> Recebimentos
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {p.data!.pgtos!.map((pg, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', border: '1px solid #2a2a2a', borderRadius: '8px' }}>
                          <div>
                            <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{pg.d || `Parcela ${i + 1}`}</div>
                            {pg.dt && <div style={{ fontSize: '11px', color: '#555', marginTop: '2px' }}>{fd(pg.dt)}</div>}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, color: '#f0ece4' }}>{fv(Number(pg.v || 0))}</span>
                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: 600, background: pg.rec ? 'rgba(93,184,122,.15)' : 'rgba(232,146,74,.15)', color: pg.rec ? '#5db87a' : '#e8924a' }}>
                              {pg.rec ? 'Recebido' : 'Pendente'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Comments */}
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '10px' }}>💬 Comentários e Atualizações</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {(p.data?.comments || []).length === 0
                      ? <div style={{ fontSize: '12px', color: '#555', padding: '12px', background: '#0d0f12', borderRadius: '8px', textAlign: 'center' }}>Nenhum comentário ainda</div>
                      : (p.data?.comments || []).map(c => (
                        <div key={c.id} style={{ background: '#0d0f12', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 14px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#e8c547' }}>{c.userName}</span>
                            <span style={{ fontSize: '10px', color: '#555' }}>{new Date(c.createdAt).toLocaleDateString('pt-BR')} · {ST_LABEL[c.stage || ''] || c.stage}</span>
                          </div>
                          <div style={{ fontSize: '13px', color: '#d1d5db', lineHeight: 1.5 }}>{c.text}</div>
                          {c.link && <a href={c.link} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#5b9bd5', display: 'block', marginTop: '6px' }}>🔗 {c.link}</a>}
                        </div>
                      ))
                    }
                  </div>
                  <CommentForm projectId={p.id} onSubmit={handleAddComment} />
                </div>

              </div>

              {/* Footer buttons */}
              <div style={{ padding: '16px 28px', borderTop: '1px solid #1e1e1e', display: 'flex', gap: '8px', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' as const }}>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  {(() => {
                    const pipeIdx = (PIPELINE as readonly string[]).indexOf(p.status)
                    const prevSt = pipeIdx > 0 ? PIPELINE[pipeIdx - 1] : null
                    const nextSt = pipeIdx >= 0 && pipeIdx < PIPELINE.length - 1 ? PIPELINE[pipeIdx + 1] : null
                    return (
                      <>
                        {prevSt && <button onClick={() => handleStatusChange(p.id, prevSt)} style={{ background: 'transparent', border: '1px solid #2a2a2a', color: '#888', padding: '8px 14px', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>← {ST_LABEL[prevSt]}</button>}
                        {nextSt && <button onClick={() => handleStatusChange(p.id, nextSt)} style={{ background: (ST_COLOR[nextSt] || '#555') + '22', border: 'none', color: ST_COLOR[nextSt] || '#f0ece4', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{ST_LABEL[nextSt]} →</button>}
                      </>
                    )
                  })()}
                  {/* Stage access: Concluir etapa button */}
                  {hasStageFilter && stageAccess?.includes(p.status) && (() => {
                    const pipeIdx = (PIPELINE as readonly string[]).indexOf(p.status)
                    const nextSt = pipeIdx >= 0 && pipeIdx < PIPELINE.length - 1 ? PIPELINE[pipeIdx + 1] : null
                    return nextSt ? (
                      <button onClick={() => { handleStatusChange(p.id, nextSt); setViewProject(null) }}
                        style={{ background: '#5db87a', border: 'none', color: '#000', padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                        ✓ Concluir: {ST_LABEL[nextSt]} →
                      </button>
                    ) : null
                  })()}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                  <button onClick={() => setViewProject(null)} style={{ ...btn('ghost'), padding: '8px 16px' }}>Fechar</button>
                  {p.quote_token && (
                    <button onClick={() => window.open(`/orcamento/${p.quote_token}`, '_blank')} style={{ ...btn('ghost'), padding: '8px 14px' }}>📄</button>
                  )}
                  {p.quote_token && (
                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/orcamento/${p.quote_token}`); toast.show('Link copiado!', 'info') }} style={{ ...btn('ghost'), padding: '8px 14px' }}>🔗</button>
                  )}
                  {p.status === 'orcamento' && (
                    <button onClick={() => { handleApprove(p.id); setViewProject(null) }} style={{ ...btn('green'), padding: '8px 16px' }}>✅ Aprovar</button>
                  )}
                  {!['orcamento', 'orcamento_desaprovado'].includes(p.status) && !isEditor && (
                    <button
                      onClick={async () => {
                        const res = await fetch(`/api/projects/${p.id}/sync-finance`, { method: 'POST' })
                        const d = await res.json()
                        if (res.ok) toast.show(`✅ Financeiro sincronizado! ${d.synced} transações.`, 'success')
                        else toast.show('Erro: ' + (d.error || 'Erro ao sincronizar'), 'error')
                      }}
                      style={{ ...btn('ghost'), padding: '8px 14px', fontSize: '12px', color: '#5b9bd5', borderColor: '#5b9bd544' }}
                      title="Sincroniza pagamentos recebidos e custos com o financeiro"
                    >
                      🔄 Sincronizar Financeiro
                    </button>
                  )}
                  <button onClick={() => { setViewProject(null); openEdit(p) }} style={{ ...btn('primary'), padding: '8px 16px' }}>✏️ Editar</button>
                </div>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
