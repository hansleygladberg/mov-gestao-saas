'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/lib/toast'

interface UserProfile {
  id: string
  email: string
  name?: string
  phone?: string
  avatar_url?: string
  role: string
  company_id: string
  companies?: { name: string }
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'Administrador',
  editor: 'Editor',
  viewer: 'Visualizador',
}

function avatarColor(str: string): string {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  const hue = Math.abs(hash) % 360
  return `hsl(${hue}, 55%, 38%)`
}

function initials(name?: string, email?: string): string {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    return parts[0].slice(0, 2).toUpperCase()
  }
  if (email) return email.slice(0, 2).toUpperCase()
  return '??'
}

export default function ProfilePage() {
  const router = useRouter()
  const { show } = useToast()

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  // personal info form
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)

  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  // password form
  const [curPass, setCurPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confPass, setConfPass] = useState('')
  const [savingPass, setSavingPass] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data, error } = await supabase
        .from('users')
        .select('*, companies(name)')
        .eq('id', authUser.id)
        .single()

      if (error || !data) { router.push('/login'); return }

      setProfile({ ...data, email: authUser.email ?? '' })
      setName(data.name ?? '')
      setPhone(data.phone ?? '')
      setLoading(false)
    }
    load().catch(() => router.push('/login'))
  }, [router])

  async function handleSaveInfo(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSavingInfo(true)
    const supabase = createClient()
    const { error } = await supabase
      .from('users')
      .update({ name: name.trim() || null, phone: phone.trim() || null })
      .eq('id', profile.id)
    setSavingInfo(false)
    if (error) {
      show('Erro ao salvar dados pessoais.', 'error')
    } else {
      setProfile(p => p ? { ...p, name: name.trim() || undefined, phone: phone.trim() || undefined } : p)
      show('Dados pessoais atualizados!', 'success')
    }
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return
    if (!file.type.startsWith('image/')) {
      show('Selecione um arquivo de imagem válido.', 'error')
      return
    }
    setUploadingAvatar(true)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() ?? 'jpg'
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('user-avatars')
        .upload(path, file, { upsert: true })
      if (uploadError) { show('Erro ao enviar imagem.', 'error'); return }
      const { data: { publicUrl } } = supabase.storage.from('user-avatars').getPublicUrl(path)
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', profile.id)
      if (updateError) { show('Erro ao salvar URL da foto.', 'error'); return }
      setProfile(p => p ? { ...p, avatar_url: publicUrl } : p)
      show('Foto de perfil atualizada!', 'success')
    } finally {
      setUploadingAvatar(false)
    }
  }

  async function handleChangePass(e: React.FormEvent) {
    e.preventDefault()
    if (newPass !== confPass) { show('As senhas não coincidem.', 'error'); return }
    if (newPass.length < 6)   { show('A nova senha deve ter ao menos 6 caracteres.', 'error'); return }
    setSavingPass(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password: newPass })
    setSavingPass(false)
    if (error) {
      show(error.message ?? 'Erro ao alterar senha.', 'error')
    } else {
      setCurPass(''); setNewPass(''); setConfPass('')
      show('Senha alterada com sucesso!', 'success')
    }
  }

  // ── Styles ─────────────────────────────────────────────────────────────

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', background: '#1a1d24',
    border: '1px solid #2a2d35', borderRadius: '8px', color: '#f0ece4',
    fontSize: '13px', outline: 'none', boxSizing: 'border-box',
  }

  const label: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: '#888', textTransform: 'uppercase',
    letterSpacing: '1px', marginBottom: '6px', fontWeight: 500,
  }

  const card: React.CSSProperties = {
    background: '#111318', border: '1px solid #1e2028',
    borderRadius: '12px', padding: '24px',
  }

  const btn: React.CSSProperties = {
    padding: '9px 20px', background: '#e8c547', color: '#0d0f12',
    border: 'none', borderRadius: '8px', fontSize: '13px',
    fontWeight: 600, cursor: 'pointer', transition: 'opacity .12s',
    fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif",
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: '14px', fontWeight: 600, color: '#f0ece4',
    marginBottom: '20px',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d0f12' }}>
      <div style={{ color: '#555', fontSize: '13px' }}>Carregando...</div>
    </div>
  )

  if (!profile) return null

  const avatarBg    = avatarColor(profile.email)
  const avatarLabel = initials(profile.name, profile.email)
  const companyName = (profile.companies as { name: string } | undefined)?.name ?? '—'
  const roleName    = ROLE_LABELS[profile.role] ?? profile.role

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto', fontFamily: "var(--font-montserrat), 'Montserrat', sans-serif" }}>

      {/* ── Page header ──────────────────────────────────────────── */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f0ece4', margin: 0, letterSpacing: '-0.3px' }}>
          Meu Perfil
        </h1>
        <p style={{ fontSize: '13px', color: '#555', marginTop: '6px', marginBottom: 0 }}>
          Gerencie suas informações pessoais e segurança da conta.
        </p>
      </div>

      {/* ── Avatar + identity banner ─────────────────────────────── */}
      <div style={{ ...card, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '20px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Avatar"
              style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }}
            />
          ) : (
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: avatarBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px', fontWeight: 700, color: '#fff',
              userSelect: 'none',
            }}>
              {avatarLabel}
            </div>
          )}
          {uploadingAvatar ? (
            <span style={{ fontSize: '11px', color: '#888' }}>Carregando...</span>
          ) : (
            <label style={{ fontSize: '11px', color: '#e8c547', cursor: 'pointer' }}>
              Alterar foto
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            </label>
          )}
        </div>
        <div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: '#f0ece4', lineHeight: 1.2 }}>
            {profile.name || profile.email}
          </div>
          {profile.name && (
            <div style={{ fontSize: '13px', color: '#555', marginTop: '3px' }}>{profile.email}</div>
          )}
          <div style={{ fontSize: '12px', color: '#e8c547', marginTop: '5px', fontWeight: 500 }}>
            {roleName} · {companyName}
          </div>
        </div>
      </div>

      {/* ── Two column sections ──────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px', marginBottom: '20px' }}>

        {/* Dados Pessoais */}
        <div style={card}>
          <div style={sectionTitle}>Dados Pessoais</div>
          <form onSubmit={handleSaveInfo}>
            <div style={{ marginBottom: '16px' }}>
              <label style={label}>Nome completo</label>
              <input
                style={inp}
                type="text"
                placeholder="Seu nome"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={label}>Telefone</label>
              <input
                style={inp}
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
            </div>
            <button type="submit" style={{ ...btn, opacity: savingInfo ? 0.6 : 1 }} disabled={savingInfo}>
              {savingInfo ? 'Salvando...' : 'Salvar Dados'}
            </button>
          </form>
        </div>

        {/* Trocar Senha */}
        <div style={card}>
          <div style={sectionTitle}>Trocar Senha</div>
          <form onSubmit={handleChangePass}>
            <div style={{ marginBottom: '16px' }}>
              <label style={label}>Senha atual</label>
              <input
                style={inp}
                type="password"
                placeholder="••••••••"
                value={curPass}
                onChange={e => setCurPass(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={label}>Nova senha</label>
              <input
                style={inp}
                type="password"
                placeholder="••••••••"
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={label}>Confirmar nova senha</label>
              <input
                style={inp}
                type="password"
                placeholder="••••••••"
                value={confPass}
                onChange={e => setConfPass(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" style={{ ...btn, opacity: savingPass ? 0.6 : 1 }} disabled={savingPass}>
              {savingPass ? 'Alterando...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </div>

      {/* ── Read-only info card ──────────────────────────────────── */}
      <div style={{ ...card }}>
        <div style={sectionTitle}>Informações da Conta</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          {[
            { label: 'E-mail', value: profile.email },
            { label: 'Perfil de acesso', value: roleName },
            { label: 'Empresa', value: companyName },
          ].map(({ label: lbl, value }) => (
            <div key={lbl}>
              <div style={{ fontSize: '11px', color: '#555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '5px', fontWeight: 500 }}>
                {lbl}
              </div>
              <div style={{ fontSize: '14px', color: '#f0ece4', fontWeight: 500 }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  )
}
