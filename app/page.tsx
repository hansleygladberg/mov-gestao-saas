'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    async function checkAuth() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.push('/dashboard')
      } else {
        setIsAuthenticated(false)
      }
    }

    checkAuth()
  }, [router])

  if (isAuthenticated === null) {
    return <div className="min-h-screen bg-slate-900" />
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-slate-900 to-slate-800">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">MOV Gestão</h1>
        <p className="text-xl text-slate-300 mb-8">Seu sistema de gestão para produtoras</p>
        <div className="flex gap-4 justify-center">
          <a
            href="/login"
            className="px-8 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Entrar
          </a>
          <a
            href="/signup"
            className="px-8 py-3 bg-slate-700 text-white rounded-lg font-semibold hover:bg-slate-600 transition"
          >
            Criar conta
          </a>
        </div>
      </div>
    </main>
  )
}
