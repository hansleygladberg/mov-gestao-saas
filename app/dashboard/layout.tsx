'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

// ── SVG Icons ────────────────────────────────────────────────────────
const IGrid     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
const IFilm     = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="2.18"/><line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="2" y1="7" x2="7" y2="7"/><line x1="2" y1="17" x2="7" y2="17"/><line x1="17" y1="17" x2="22" y2="17"/><line x1="17" y1="7" x2="22" y2="7"/></svg>
const IUsers    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IDollar   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
const IDoc      = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
const ISettings = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
const ICalendar = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
const ITrash    = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
const ILogout   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>

function fv(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 }).format(v)
}

interface User    { id: string; email: string; name?: string; role: string }
interface Counts  { activeProjects: number; quotes: number }
interface Finance { totalEntradas: number; saldoGeral: number }

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, setUser]             = useState<User | null>(null)
  const [counts, setCounts]         = useState<Counts>({ activeProjects: 0, quotes: 0 })
  const [finance, setFinance]       = useState<Finance>({ totalEntradas: 0, saldoGeral: 0 })
  const [loading, setLoading]       = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isDesktop, setIsDesktop]   = useState(true)
  const router   = useRouter()
  const pathname = usePathname()

  // ── Detect mobile/desktop ───────────────────────────────────────────
  useEffect(() => {
    function checkWidth() {
      const desktop = window.innerWidth >= 768
      setIsDesktop(desktop)
      if (desktop) setSidebarOpen(false)
    }
    checkWidth()
    window.addEventListener('resize', checkWidth)
    return () => window.removeEventListener('resize', checkWidth)
  }, [])

  // ── Auto-close sidebar on navigation (mobile) ───────────────────────
  useEffect(() => {
    if (!isDesktop) setSidebarOpen(false)
  }, [pathname, isDesktop])

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) { router.push('/login'); return }

      const { data: userData } = await supabase.from('users').select('*').eq('id', authUser.id).single()
      if (!userData) { router.push('/login'); return }
      setUser(userData)

      // badge counts
      const { data: projects } = await supabase
        .from('projects').select('status').eq('company_id', userData.company_id)
      if (projects) {
        setCounts({
          activeProjects: projects.filter(p => !['entregue', 'orcamento', 'orcamento_desaprovado'].includes(p.status)).length,
          quotes: projects.filter(p => p.status === 'orcamento').length,
        })
      }

      // saldo geral
      const { data: tx } = await supabase
        .from('transactions').select('type, value').eq('company_id', userData.company_id)
      if (tx) {
        const entradas  = tx.filter(t => t.type === 'entrada').reduce((s, t) => s + Number(t.value), 0)
        const despesas  = tx.filter(t => t.type === 'saida').reduce((s, t) => s + Number(t.value), 0)
        setFinance({ totalEntradas: entradas, saldoGeral: entradas - despesas })
      }

      setLoading(false)
    }
    load().catch(() => { router.push('/login') })
  }, [router])

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
      <div style={{ color: '#555', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif', fontSize: '13px' }}>Carregando...</div>
    </div>
  )

  const on = (href: string) => href === '/dashboard' ? pathname === href : pathname.startsWith(href)

  // ── estilos base reutilizáveis ──
  const linkBase: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: '9px',
    padding: '9px 10px', borderRadius: '6px',
    textDecoration: 'none', fontSize: '13px', fontWeight: 400,
    transition: 'background .12s, color .12s',
  }
  const linkOn:  React.CSSProperties = { ...linkBase, background: 'rgba(232,197,71,.12)', color: '#e8c547' }
  const linkOff: React.CSSProperties = { ...linkBase, background: 'transparent',          color: '#888888' }

  const Badge = ({ n }: { n: number }) => n > 0 ? (
    <span style={{ marginLeft: 'auto', background: '#e8c547', color: '#000', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', lineHeight: '16px' }}>{n}</span>
  ) : null

  const SectionLabel = ({ label }: { label: string }) => (
    <div style={{ fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '2px', fontWeight: 400, padding: '10px 10px 5px' }}>{label}</div>
  )

  // ── Sidebar position style (mobile vs desktop) ──
  const sidebarStyle: React.CSSProperties = {
    width: '210px',
    background: '#111111',
    borderRight: '1px solid #2a2a2a',
    position: 'fixed',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 200,
    flexShrink: 0,
    top: 0,
    left: 0,
    transform: isDesktop ? 'none' : (sidebarOpen ? 'translateX(0)' : 'translateX(-100%)'),
    transition: 'transform .25s',
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0a0a0a', fontFamily: 'var(--font-dm-sans), DM Sans, sans-serif' }}>

      {/* ── Hamburger button (mobile only) ──────────────────────────── */}
      {!isDesktop && (
        <button
          onClick={() => setSidebarOpen(prev => !prev)}
          aria-label="Abrir menu"
          style={{
            position: 'fixed',
            top: 12,
            left: 12,
            zIndex: 201,
            background: '#111',
            border: '1px solid #2a2a2a',
            borderRadius: '8px',
            padding: '8px 10px',
            cursor: 'pointer',
            color: '#f0ece4',
            fontSize: '18px',
            lineHeight: 1,
          }}
        >
          &#9776;
        </button>
      )}

      {/* ── Backdrop overlay (mobile, sidebar open) ─────────────────── */}
      {!isDesktop && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.55)',
            zIndex: 199,
          }}
        />
      )}

      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside style={sidebarStyle}>

        {/* Logo */}
        <div style={{ padding: '22px 18px 18px', borderBottom: '1px solid #2a2a2a', background: 'transparent' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/img/logo.png" alt="MOV Produtora" style={{ width: '120px', display: 'block' }} />
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '6px 8px', overflowY: 'auto' }}>
          <SectionLabel label="Principal" />
          <Link href="/dashboard"          style={on('/dashboard')         ? linkOn : linkOff}><IGrid />     Dashboard</Link>
          <Link href="/dashboard/projects" style={on('/dashboard/projects') ? linkOn : linkOff}>
            <IFilm /> Projetos <Badge n={counts.activeProjects} />
          </Link>
          <Link href="/dashboard/clients"  style={on('/dashboard/clients')  ? linkOn : linkOff}><IUsers />    Clientes</Link>

          <SectionLabel label="Financeiro" />
          <Link href="/dashboard/finance"  style={on('/dashboard/finance')  ? linkOn : linkOff}><IDollar />   Financeiro</Link>
          <Link href="/dashboard/quotes"   style={on('/dashboard/quotes')   ? linkOn : linkOff}>
            <IDoc /> Orçamentos <Badge n={counts.quotes} />
          </Link>

          <SectionLabel label="Sistema" />
          {user?.role === 'admin' && (
            <Link href="/dashboard/admin"   style={on('/dashboard/admin')   ? linkOn : linkOff}><ISettings /> Painel ADM</Link>
          )}
          <Link href="/dashboard/events"   style={on('/dashboard/events')   ? linkOn : linkOff}><ICalendar /> Calendário</Link>
          <Link href="/dashboard/trash"    style={on('/dashboard/trash')    ? linkOn : linkOff}><ITrash />    Lixeira</Link>
        </nav>

        {/* Footer */}
        <div style={{ padding: '14px', marginTop: 'auto', borderTop: '1px solid #2a2a2a' }}>
          {/* Logout discreto */}
          <button
            onClick={handleLogout}
            style={{ width: '100%', padding: '7px 10px', background: 'transparent', border: 'none', color: '#555555', fontSize: '11px', fontWeight: 400, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '10px', borderRadius: '6px', transition: 'color .12s' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#888')}
            onMouseLeave={e => (e.currentTarget.style.color = '#555')}
          >
            <ILogout /> Sair da conta
          </button>

          {/* Saldo Geral */}
          <div style={{ background: 'rgba(232,197,71,.12)', border: '1px solid #2a2a2a', borderRadius: '6px', padding: '12px' }}>
            <div style={{ fontSize: '10px', color: '#555555', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>
              Saldo Geral
            </div>
            <div style={{ fontFamily: 'var(--font-syne), Syne, sans-serif', fontSize: '20px', fontWeight: 700, color: finance.saldoGeral >= 0 ? '#e8c547' : '#e85d4a', lineHeight: 1.2 }}>
              {fv(finance.saldoGeral)}
            </div>
            <div style={{ fontSize: '11px', color: '#888888', marginTop: '3px' }}>
              {fv(finance.totalEntradas)} entrada
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main style={{
        flex: 1,
        marginLeft: isDesktop ? '210px' : '0',
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}>
        {children}
      </main>
    </div>
  )
}
