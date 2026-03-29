'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    projects: 0,
    clients: 0,
    revenue: 0,
    expenses: 0,
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadStats() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!userData) return

      const companyId = userData.company_id

      // Carregar estatísticas
      const { count: projectsCount } = await supabase
        .from('projects')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      const { count: clientsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact' })
        .eq('company_id', companyId)

      const { data: transactions } = await supabase
        .from('transactions')
        .select('*')
        .eq('company_id', companyId)

      const revenue = transactions?.reduce((sum, t) => {
        if (t.type === 'entrada' || t.type === 'arec') {
          return sum + Number(t.value || 0)
        }
        return sum
      }, 0) || 0

      const expenses = transactions?.reduce((sum, t) => {
        if (t.type === 'saida' || t.type === 'apag') {
          return sum + Number(t.value || 0)
        }
        return sum
      }, 0) || 0

      setStats({
        projects: projectsCount || 0,
        clients: clientsCount || 0,
        revenue,
        expenses,
      })

      setLoading(false)
    }

    loadStats()
  }, [])

  if (loading) {
    return <div className="text-white">Carregando...</div>
  }

  const profit = stats.revenue - stats.expenses
  const margin = stats.revenue > 0 ? Math.round((profit / stats.revenue) * 100) : 0

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-8">Dashboard</h2>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Projects */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm">Projetos Ativos</p>
          <p className="text-4xl font-bold text-blue-400 mt-2">{stats.projects}</p>
        </div>

        {/* Clients */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm">Clientes</p>
          <p className="text-4xl font-bold text-green-400 mt-2">{stats.clients}</p>
        </div>

        {/* Revenue */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm">Recebido</p>
          <p className="text-2xl font-bold text-green-400 mt-2">
            R$ {stats.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
        </div>

        {/* Margin */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm">Margem Líquida</p>
          <p className={`text-4xl font-bold mt-2 ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {margin}%
          </p>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-slate-800 rounded-lg p-8 border border-slate-700">
        <h3 className="text-2xl font-bold text-white mb-4">Bem-vindo ao MOV Gestão! 🎬</h3>
        <p className="text-slate-300 mb-4">
          Este é o seu dashboard principal. Aqui você pode acompanhar:
        </p>
        <ul className="text-slate-300 list-disc list-inside space-y-2">
          <li>📊 Projetos em andamento e seu status</li>
          <li>👥 Clientes e suas informações</li>
          <li>💰 Financeiro e fluxo de caixa</li>
          <li>📅 Eventos e prazos importantes</li>
        </ul>
        <p className="text-slate-400 text-sm mt-6">
          ℹ️ Em breve: integração com a interface completa do MOV Gestão
        </p>
      </div>
    </div>
  )
}
