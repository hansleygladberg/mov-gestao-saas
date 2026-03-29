'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function DashboardPage() {
  const [stats, setStats] = useState({
    projects: 0,
    clients: 0,
    revenue: 0,
    expenses: 0,
    recentProjects: [] as any[],
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

      const { data: recentProjects } = await supabase
        .from('projects')
        .select('*')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(5)

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
        recentProjects: recentProjects || [],
      })

      setLoading(false)
    }

    loadStats()
  }, [])

  if (loading) {
    return <div className="text-slate-400">Carregando...</div>
  }

  const profit = stats.revenue - stats.expenses
  const margin = stats.revenue > 0 ? Math.round((profit / stats.revenue) * 100) : 0

  const STATUS_LABELS: Record<string, string> = {
    orcamento: '⏳ Orçamento',
    orcamento_desaprovado: '❌ Desaprovado',
    producao: '🎬 Produção',
    edicao: '✂️ Edição',
    entregue: '✅ Entregue',
    pausado: '⏸ Pausado',
  }

  return (
    <div>
      <h2 className="text-3xl font-bold text-white mb-8">Dashboard</h2>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Projects */}
        <Link href="/dashboard/projects">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 transition cursor-pointer">
            <p className="text-slate-400 text-sm">Projetos Ativos</p>
            <p className="text-4xl font-bold text-blue-400 mt-2">{stats.projects}</p>
            <p className="text-xs text-slate-500 mt-2">Clique para gerenciar</p>
          </div>
        </Link>

        {/* Clients */}
        <Link href="/dashboard/clients">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-green-500 transition cursor-pointer">
            <p className="text-slate-400 text-sm">Clientes</p>
            <p className="text-4xl font-bold text-green-400 mt-2">{stats.clients}</p>
            <p className="text-xs text-slate-500 mt-2">Clique para gerenciar</p>
          </div>
        </Link>

        {/* Revenue */}
        <Link href="/dashboard/finance">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-emerald-500 transition cursor-pointer">
            <p className="text-slate-400 text-sm">Recebido</p>
            <p className="text-2xl font-bold text-emerald-400 mt-2">
              R$ {stats.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-slate-500 mt-2">Clique para detalhes</p>
          </div>
        </Link>

        {/* Margin */}
        <div className="bg-slate-800 rounded-lg p-6 border border-slate-700">
          <p className="text-slate-400 text-sm">Margem Líquida</p>
          <p className={`text-4xl font-bold mt-2 ${margin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {margin}%
          </p>
          <p className="text-xs text-slate-500 mt-2">
            {profit >= 0 ? '+' : '-'} R$ {Math.abs(profit).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Recent Projects */}
      <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 mb-8">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-bold text-white">Projetos Recentes</h3>
          <Link href="/dashboard/projects" className="text-blue-400 hover:text-blue-300 text-sm">
            Ver todos →
          </Link>
        </div>

        {stats.recentProjects.length > 0 ? (
          <div className="space-y-3">
            {stats.recentProjects.map((project) => (
              <div
                key={project.id}
                className="flex items-center justify-between p-4 bg-slate-700 rounded-lg hover:bg-slate-600 transition"
              >
                <div>
                  <p className="font-semibold text-white">{project.name}</p>
                  <p className="text-xs text-slate-400">{project.type}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm font-bold text-slate-300">
                    R$ {project.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                  </span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    project.status === 'entregue'
                      ? 'bg-green-100 text-green-800'
                      : project.status === 'producao'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {STATUS_LABELS[project.status] || project.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-400">Nenhum projeto ainda</p>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link href="/dashboard/projects" className="block">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-blue-500 transition cursor-pointer text-center">
            <p className="text-3xl mb-2">🎬</p>
            <p className="text-white font-semibold">Novo Projeto</p>
            <p className="text-xs text-slate-400 mt-1">Criar proposta ou projeto</p>
          </div>
        </Link>

        <Link href="/dashboard/clients" className="block">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-green-500 transition cursor-pointer text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-white font-semibold">Novo Cliente</p>
            <p className="text-xs text-slate-400 mt-1">Cadastrar cliente</p>
          </div>
        </Link>

        <Link href="/dashboard/finance" className="block">
          <div className="bg-slate-800 rounded-lg p-6 border border-slate-700 hover:border-emerald-500 transition cursor-pointer text-center">
            <p className="text-3xl mb-2">💰</p>
            <p className="text-white font-semibold">Novo Lançamento</p>
            <p className="text-xs text-slate-400 mt-1">Registrar transação</p>
          </div>
        </Link>
      </div>
    </div>
  )
}
