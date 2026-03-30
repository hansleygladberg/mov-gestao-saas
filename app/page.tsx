'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Home() {
  const [checking, setChecking] = useState(true)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      } else {
        setChecking(false)
      }
    }
    checkAuth()
  }, [router])

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0a' }} />
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      <div style={{ width: '100%', maxWidth: '400px', padding: '0 20px', textAlign: 'center' }}>
        {/* Logo */}
        <div style={{ marginBottom: '48px' }}>
          <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '48px', color: '#e8c547', letterSpacing: '-2px', lineHeight: 1 }}>MOV</div>
          <div style={{ fontSize: '11px', color: '#555', letterSpacing: '4px', textTransform: 'uppercase', marginTop: '8px' }}>Gestão · Produtora</div>
        </div>

        {/* Tagline */}
        <div style={{ marginBottom: '40px' }}>
          <p style={{ fontSize: '15px', color: '#888', lineHeight: 1.6 }}>
            Gerencie projetos, clientes e finanças da sua produtora em um só lugar.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <Link
            href="/login"
            style={{
              display: 'block', padding: '13px', background: '#e8c547', color: '#000',
              fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '14px',
              borderRadius: '8px', textDecoration: 'none', letterSpacing: '.3px',
              transition: 'background .15s',
            }}
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            style={{
              display: 'block', padding: '13px',
              background: 'transparent', color: '#f0ece4',
              fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '14px',
              borderRadius: '8px', textDecoration: 'none',
              border: '1px solid #2a2a2a',
              transition: 'border-color .15s',
            }}
          >
            Criar conta gratuita
          </Link>
        </div>

        {/* Footer */}
        <div style={{ marginTop: '48px', fontSize: '11px', color: '#333', letterSpacing: '0.5px' }}>
          © {new Date().getFullYear()} MOV Gestão
        </div>
      </div>
    </div>
  )
}
