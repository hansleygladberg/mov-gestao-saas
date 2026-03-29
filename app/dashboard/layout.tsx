'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  email: string
  role: string
}

interface Company {
  id: string
  name: string
}

const MENU_ITEMS = [
  { href: '/dashboard', label: '📊 Dashboard', icon: '📊' },
  { href: '/dashboard/projects', label: '🎬 Projetos', icon: '🎬' },
  { href: '/dashboard/clients', label: '👥 Clientes', icon: '👥' },
  { href: '/dashboard/finance', label: '💰 Financeiro', icon: '💰' },
  // { href: '/dashboard/calendar', label: '📅 Calendário', icon: '📅' },
]

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [company, setCompany] = useState<Company | null>(null)
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    async function loadUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        router.push('/login')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (userData) {
        setUser(userData)

        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('id', userData.company_id)
          .single()

        if (companyData) {
          setCompany(companyData)
        }
      }

      setLoading(false)
    }

    loadUser()
  }, [router])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Carregando...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-900">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-slate-800 border-r border-slate-700 transition-all duration-300 fixed h-screen flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center justify-between">
            {sidebarOpen && <h1 className="text-xl font-bold text-white">MOV</h1>}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1 hover:bg-slate-700 rounded transition"
            >
              {sidebarOpen ? '←' : '→'}
            </button>
          </div>
        </div>

        {/* Menu */}
        <nav className="flex-1 p-4 space-y-2">
          {MENU_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                pathname === item.href
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:bg-slate-700'
              }`}
              title={!sidebarOpen ? item.label : undefined}
            >
              <span className="text-xl">{item.icon}</span>
              {sidebarOpen && <span>{item.label.split(' ')[1]}</span>}
            </Link>
          ))}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-slate-700 space-y-3">
          {sidebarOpen && (
            <div className="text-xs">
              <p className="text-slate-400">{company?.name}</p>
              <p className="text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="w-full px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition"
          >
            {sidebarOpen ? 'Sair' : '🚪'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className={`flex-1 ${sidebarOpen ? 'ml-64' : 'ml-20'} transition-all duration-300`}>
        {/* Top Bar */}
        <div className="bg-slate-800 border-b border-slate-700 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-white">{company?.name}</h1>
            <div className="text-right">
              <p className="text-sm text-white">{user?.email}</p>
              <p className="text-xs text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
        </div>

        {/* Page Content */}
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  )
}

