'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // 1. Criar empresa
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .insert([{ name: companyName }])
        .select()
        .single()

      if (companyError) {
        setError('Erro ao criar empresa')
        return
      }

      // 2. Registrar usuário com Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        return
      }

      if (!authData.user) {
        setError('Erro ao criar usuário')
        return
      }

      // 3. Criar registro na tabela users com admin role
      const { error: userError } = await supabase
        .from('users')
        .insert([
          {
            id: authData.user.id,
            email,
            company_id: companyData.id,
            role: 'admin',
          },
        ])

      if (userError) {
        setError('Erro ao registrar usuário')
        return
      }

      // Sucesso - redirecionar para login
      router.push('/login?signup=success')
    } catch (err) {
      setError('Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
      <h1 className="text-3xl font-bold text-center mb-2 text-slate-900 dark:text-white">
        Criar Conta
      </h1>
      <p className="text-center text-slate-600 dark:text-slate-300 mb-8">
        Comece a usar MOV Gestão
      </p>

      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label htmlFor="company" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Nome da Empresa
          </label>
          <input
            id="company"
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Sua Produtora"
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Senha (mínimo 8 caracteres)
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            minLength={8}
            required
            className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-2 px-4 rounded-lg transition mt-6"
        >
          {loading ? 'Criando conta...' : 'Criar Conta'}
        </button>
      </form>

      <p className="text-center text-slate-600 dark:text-slate-400 mt-6">
        Já tem conta?{' '}
        <Link href="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
          Entrar
        </Link>
      </p>
    </div>
  )
}
