'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('As senhas não correspondem')
      return
    }

    if (password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          companyName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Erro ao cadastrar')
        return
      }

      router.push('/login?message=Cadastro realizado! Verifique seu email.')
    } catch (err) {
      setError('Erro ao cadastrar. Tente novamente.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const inputStyle = {
    width: '100%',
    padding: '10px 14px',
    background: '#1a1a1a',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    color: '#f0ece4',
    fontSize: '14px',
    outline: 'none',
    boxSizing: 'border-box' as const,
  }

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '1px',
    marginBottom: '8px',
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <div style={{ width: '100%', maxWidth: '400px', padding: '0 20px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '32px', color: '#e8c547', letterSpacing: '-1px' }}>MOV</div>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '3px', textTransform: 'uppercase', marginTop: '4px' }}>Gestão · Produtora</div>
        </div>

        {/* Card */}
        <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '12px', padding: '32px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '20px', color: '#f0ece4', marginBottom: '4px' }}>Criar conta</h2>
          <p style={{ fontSize: '13px', color: '#555', marginBottom: '28px' }}>Registre sua produtora no sistema</p>

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(232,93,74,.1)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '8px', color: '#e85d4a', fontSize: '13px', marginBottom: '20px' }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSignup}>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Nome da Empresa</label>
              <input
                type="text"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
                placeholder="MOV Produtora"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#e8c547'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#e8c547'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={labelStyle}>Senha</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#e8c547'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
            </div>
            <div style={{ marginBottom: '24px' }}>
              <label style={labelStyle}>Confirmar Senha</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#e8c547'}
                onBlur={e => e.target.style.borderColor = '#2a2a2a'}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{ width: '100%', padding: '11px', background: loading ? '#c9a92e' : '#e8c547', color: '#000', fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', transition: 'background .15s', letterSpacing: '.3px' }}
            >
              {loading ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: '#555' }}>
          Já tem conta?{' '}
          <Link href="/login" style={{ color: '#e8c547', textDecoration: 'none', fontWeight: 500 }}>
            Entre aqui
          </Link>
        </p>
      </div>
    </div>
  )
}
