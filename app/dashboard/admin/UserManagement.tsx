'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const PIPELINE_STAGES = [
  { key: 'orcamento', label: 'Orçamento' },
  { key: 'producao', label: 'Em Produção' },
  { key: 'edicao', label: 'Edição' },
  { key: 'aguardando_cliente', label: 'Aguard. Cliente' },
  { key: 'revisao', label: 'Revisão' },
  { key: 'aprovado', label: 'Aprovado' },
  { key: 'finalizado', label: 'Finalizado' },
]

const MODULES = [
  { key: 'projetos', label: 'Projetos', icon: '🎬' },
  { key: 'clientes', label: 'Clientes', icon: '👥' },
  { key: 'financeiro', label: 'Financeiro', icon: '💰' },
  { key: 'relatorios', label: 'Relatórios', icon: '📊' },
  { key: 'freelancers', label: 'Freelancers', icon: '🎯' },
  { key: 'adm', label: 'Painel ADM', icon: '⚙️' },
]

const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  projetos: { view: true, create: true, edit: true, delete: false },
  clientes: { view: true, create: true, edit: true, delete: false },
  financeiro: { view: true, create: true, edit: false, delete: false },
  relatorios: { view: true },
  freelancers: { view: true, create: false, edit: false, delete: false },
  adm: { view: false },
}

const ADMIN_PERMISSIONS: Record<string, Record<string, boolean>> = {
  projetos: { view: true, create: true, edit: true, delete: true },
  clientes: { view: true, create: true, edit: true, delete: true },
  financeiro: { view: true, create: true, edit: true, delete: true },
  relatorios: { view: true },
  freelancers: { view: true, create: true, edit: true, delete: true },
  adm: { view: true },
}

interface UserData {
  id: string
  email: string
  name?: string
  role: string
  is_active?: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  permissions?: Record<string, any>
  created_at: string
}

function StageAccessGrid({ stages, onChange }: { stages: string[], onChange: (s: string[]) => void }) {
  return (
    <div style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px', marginBottom: '8px' }}>
      <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
        Acesso por Etapa de Projeto
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
        {PIPELINE_STAGES.map(s => {
          const active = stages.includes(s.key)
          return (
            <button key={s.key} type="button" onClick={() => {
              onChange(active ? stages.filter(x => x !== s.key) : [...stages, s.key])
            }} style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? 'rgba(93,184,122,.2)' : '#222', color: active ? '#5db87a' : '#555', transition: 'all .12s' }}>
              {s.label}
            </button>
          )
        })}
      </div>
      <p style={{ fontSize: '11px', color: '#444', lineHeight: 1.4, margin: 0 }}>
        {stages.length === 0 ? '✓ Sem restrição — usuário vê todas as etapas' : `Restrito a ${stages.length} etapa${stages.length > 1 ? 's' : ''} selecionada${stages.length > 1 ? 's' : ''}`}
      </p>
    </div>
  )
}

function PermGrid({ perms, onToggle }: { perms: Record<string, Record<string, boolean>>, onToggle: (m: string, a: string) => void }) {
  return (
    <div style={{ display: 'grid', gap: '8px' }}>
      {MODULES.map(mod => {
        const actions = ['view', 'create', 'edit', 'delete'].filter(a => mod.key !== 'relatorios' || a === 'view')
        return (
          <div key={mod.key} style={{ background: '#1a1a1a', borderRadius: '8px', padding: '12px' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#888', marginBottom: '8px' }}>{mod.icon} {mod.label}</div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {actions.map(action => {
                const active = perms[mod.key]?.[action]
                const labels: Record<string, string> = { view: 'Ver', create: 'Criar', edit: 'Editar', delete: 'Excluir' }
                return (
                  <button key={action} onClick={() => onToggle(mod.key, action)}
                    style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: 'none', background: active ? (action === 'delete' ? 'rgba(232,93,74,.2)' : 'rgba(232,197,71,.15)') : '#222', color: active ? (action === 'delete' ? '#e85d4a' : '#e8c547') : '#555', transition: 'all .12s' }}>
                    {labels[action]}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function UserManagement({ initialUsers, companyId, currentUserId }: {
  initialUsers: UserData[]
  companyId: string
  currentUserId: string
}) {
  const [users, setUsers] = useState<UserData[]>(initialUsers)
  const [showInvite, setShowInvite] = useState(false)
  const [editingUser, setEditingUser] = useState<UserData | null>(null)
  const [editingStageAccess, setEditingStageAccess] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState('')

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteName, setInviteName] = useState('')
  const [invitePassword, setInvitePassword] = useState('')
  const [inviteRole, setInviteRole] = useState('editor')
  const [invitePerms, setInvitePerms] = useState<Record<string, Record<string, boolean>>>(DEFAULT_PERMISSIONS)
  const [inviteStageAccess, setInviteStageAccess] = useState<string[]>([])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function togglePerm(module: string, action: string) {
    setInvitePerms(prev => ({
      ...prev,
      [module]: { ...prev[module], [action]: !prev[module]?.[action] }
    }))
  }

  function toggleEditPerm(module: string, action: string) {
    if (!editingUser) return
    const perms = editingUser.permissions || DEFAULT_PERMISSIONS
    setEditingUser({
      ...editingUser,
      permissions: {
        ...perms,
        [module]: { ...perms[module], [action]: !perms[module]?.[action] }
      }
    })
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/auth/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          name: inviteName,
          password: invitePassword,
          role: inviteRole,
          companyId,
          permissions: { ...invitePerms, stageAccess: inviteStageAccess },
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showToast('✅ Usuário criado com sucesso!')
      setShowInvite(false)
      setInviteEmail('')
      setInviteName('')
      setInvitePassword('')
      setInviteRole('editor')
      setInvitePerms(DEFAULT_PERMISSIONS)
      setInviteStageAccess([])

      // Refresh users
      const supabase = createClient()
      const { data: updatedUsers } = await supabase.from('users').select('*').eq('company_id', companyId).order('created_at', { ascending: true })
      if (updatedUsers) setUsers(updatedUsers)
    } catch (err: unknown) {
      showToast('❌ ' + (err instanceof Error ? err.message : 'Erro ao criar usuário'))
    } finally {
      setLoading(false)
    }
  }

  async function handleSavePermissions() {
    if (!editingUser) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('users').update({
        role: editingUser.role,
        permissions: { ...editingUser.permissions, stageAccess: editingStageAccess },
        is_active: editingUser.is_active,
      }).eq('id', editingUser.id)

      if (error) throw error

      setUsers(prev => prev.map(u => u.id === editingUser.id
        ? { ...editingUser, permissions: { ...editingUser.permissions, stageAccess: editingStageAccess } }
        : u))
      setEditingUser(null)
      showToast('✅ Permissões salvas!')
    } catch {
      showToast('❌ Erro ao salvar permissões')
    } finally {
      setLoading(false)
    }
  }

  async function toggleActive(userId: string, current: boolean) {
    const supabase = createClient()
    await supabase.from('users').update({ is_active: !current }).eq('id', userId)
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: !current } : u))
  }

  const btnStyle = (variant: 'primary' | 'ghost' | 'danger'): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: '8px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    border: variant === 'ghost' ? '1px solid #2a2a2a' : 'none',
    background: variant === 'primary' ? '#e8c547' : variant === 'danger' ? 'rgba(232,93,74,.12)' : 'transparent',
    color: variant === 'primary' ? '#000' : variant === 'danger' ? '#e85d4a' : '#888',
    transition: 'all .12s',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
  })

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '9px 12px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#f0ece4',
    fontSize: '13px',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: '#111', border: '1px solid #2a2a2a', borderRadius: '8px', padding: '12px 20px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>
          {toast}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div style={{ fontSize: '13px', color: '#555' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} no sistema</div>
        <button onClick={() => setShowInvite(true)} style={btnStyle('primary')}>+ Criar usuário</button>
      </div>

      {/* Users list */}
      <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', overflow: 'hidden', marginBottom: '24px' }}>
        {users.map((u, i) => (
          <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: i < users.length - 1 ? '1px solid #1a1a1a' : 'none' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: u.role === 'admin' ? 'rgba(232,197,71,.15)' : '#1a1a1a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: 700, color: u.role === 'admin' ? '#e8c547' : '#888', marginRight: '14px', flexShrink: 0 }}>
              {(u.name || u.email)[0].toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', color: '#f0ece4', fontWeight: 500 }}>{u.name || u.email}</div>
              <div style={{ fontSize: '11px', color: '#555' }}>{u.name ? u.email : ''}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '11px', padding: '2px 10px', borderRadius: '20px', background: u.role === 'admin' ? 'rgba(232,197,71,.12)' : '#1a1a1a', color: u.role === 'admin' ? '#e8c547' : '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.5px' }}>
                {u.role}
              </span>
              <span style={{ fontSize: '11px', color: u.is_active !== false ? '#5db87a' : '#555' }}>
                {u.is_active !== false ? '● Ativo' : '○ Inativo'}
              </span>
              {u.id !== currentUserId && (
                <>
                  <button onClick={() => {
                    setEditingUser({ ...u, permissions: u.permissions || DEFAULT_PERMISSIONS })
                    setEditingStageAccess(u.permissions?.stageAccess || [])
                  }} style={btnStyle('ghost')}>Permissões</button>
                  <button onClick={() => toggleActive(u.id, u.is_active !== false)} style={btnStyle('ghost')} title={u.is_active !== false ? 'Desativar' : 'Ativar'}>
                    {u.is_active !== false ? '⏸' : '▶'}
                  </button>
                </>
              )}
              {u.id === currentUserId && <span style={{ fontSize: '11px', color: '#555' }}>(você)</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Create user modal */}
      {showInvite && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>Criar novo usuário</h3>
              <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <form onSubmit={handleInvite} style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Nome</label>
                  <input style={inputStyle} value={inviteName} onChange={e => setInviteName(e.target.value)} placeholder="João Silva" required />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Nível de acesso</label>
                  <select style={{ ...inputStyle }} value={inviteRole} onChange={e => {
                    setInviteRole(e.target.value)
                    setInvitePerms(e.target.value === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS)
                  }}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Email</label>
                <input style={inputStyle} type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="usuario@email.com" required />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Senha inicial</label>
                <input style={inputStyle} type="password" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} placeholder="Mínimo 6 caracteres" minLength={6} required />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Permissões por módulo</label>
                <PermGrid perms={invitePerms} onToggle={togglePerm} />
              </div>
              <div style={{ marginBottom: '20px' }}>
                <StageAccessGrid stages={inviteStageAccess} onChange={setInviteStageAccess} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setShowInvite(false)} style={btnStyle('ghost')}>Cancelar</button>
                <button type="submit" disabled={loading} style={btnStyle('primary')}>{loading ? 'Criando...' : 'Criar usuário'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit permissions modal */}
      {editingUser && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px' }}>
          <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', width: '100%', maxWidth: '560px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #1a1a1a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#111', zIndex: 1 }}>
              <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '16px', color: '#f0ece4' }}>Editar permissões — {editingUser.name || editingUser.email}</h3>
              <button onClick={() => setEditingUser(null)} style={{ background: 'none', border: 'none', color: '#555', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <div style={{ padding: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Nível de acesso</label>
                  <select style={{ ...inputStyle }} value={editingUser.role} onChange={e => {
                    const role = e.target.value
                    setEditingUser({ ...editingUser, role, permissions: role === 'admin' ? ADMIN_PERMISSIONS : DEFAULT_PERMISSIONS })
                  }}>
                    <option value="editor">Editor</option>
                    <option value="viewer">Visualizador</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Status</label>
                  <select style={{ ...inputStyle }} value={editingUser.is_active !== false ? 'active' : 'inactive'} onChange={e => setEditingUser({ ...editingUser, is_active: e.target.value === 'active' })}>
                    <option value="active">Ativo</option>
                    <option value="inactive">Inativo</option>
                  </select>
                </div>
              </div>
              <label style={{ display: 'block', fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>Permissões por módulo</label>
              <PermGrid perms={editingUser.permissions || DEFAULT_PERMISSIONS} onToggle={toggleEditPerm} />
              <div style={{ marginTop: '16px' }}>
                <StageAccessGrid stages={editingStageAccess} onChange={setEditingStageAccess} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button onClick={() => setEditingUser(null)} style={btnStyle('ghost')}>Cancelar</button>
                <button onClick={handleSavePermissions} disabled={loading} style={btnStyle('primary')}>{loading ? 'Salvando...' : 'Salvar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
