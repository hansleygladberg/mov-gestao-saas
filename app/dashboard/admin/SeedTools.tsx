'use client'

import { useState } from 'react'

export default function SeedTools() {
  const [loading, setLoading] = useState<'seed' | 'clear' | null>(null)
  const [msg, setMsg] = useState('')

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000) }

  async function handleSeed() {
    if (!confirm('Inserir dados fictícios para teste? Isso adicionará clientes, projetos, transações e eventos.')) return
    setLoading('seed')
    try {
      const r = await fetch('/api/seed', { method: 'POST' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      showMsg('✅ ' + d.message)
    } catch (e: unknown) {
      showMsg('❌ Erro: ' + (e instanceof Error ? e.message : 'Erro'))
    } finally { setLoading(null) }
  }

  async function handleClear() {
    if (!confirm('⚠️ Isso vai apagar TODOS os dados da empresa (projetos, clientes, financeiro, eventos, freelancers). Tem certeza?')) return
    if (!confirm('Segunda confirmação: apagar tudo permanentemente?')) return
    setLoading('clear')
    try {
      const r = await fetch('/api/seed', { method: 'DELETE' })
      const d = await r.json()
      if (!r.ok) throw new Error(d.error)
      showMsg('🗑 ' + d.message)
    } catch (e: unknown) {
      showMsg('❌ Erro: ' + (e instanceof Error ? e.message : 'Erro'))
    } finally { setLoading(null) }
  }

  return (
    <div style={{ background: '#111', border: '1px solid #2a2a2a', borderRadius: '10px', padding: '20px' }}>
      {msg && (
        <div style={{ padding: '10px 14px', background: msg.startsWith('✅') ? 'rgba(93,184,122,.1)' : msg.startsWith('🗑') ? 'rgba(93,184,122,.1)' : 'rgba(232,93,74,.1)', border: `1px solid ${msg.startsWith('❌') ? 'rgba(232,93,74,.3)' : 'rgba(93,184,122,.3)'}`, borderRadius: '8px', color: msg.startsWith('❌') ? '#e85d4a' : '#5db87a', fontSize: '13px', marginBottom: '16px' }}>
          {msg}
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' as const }}>
        <button
          onClick={handleSeed}
          disabled={loading !== null}
          style={{
            padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            cursor: loading !== null ? 'not-allowed' : 'pointer', border: 'none',
            background: loading === 'seed' ? '#b89a30' : 'rgba(232,197,71,.15)',
            color: '#e8c547', display: 'inline-flex', alignItems: 'center', gap: '8px',
            opacity: loading !== null && loading !== 'seed' ? 0.5 : 1,
          }}
        >
          {loading === 'seed' ? '⏳ Inserindo...' : '🌱 Inserir dados de teste'}
        </button>

        <button
          onClick={handleClear}
          disabled={loading !== null}
          style={{
            padding: '9px 18px', borderRadius: '8px', fontSize: '13px', fontWeight: 500,
            cursor: loading !== null ? 'not-allowed' : 'pointer', border: 'none',
            background: loading === 'clear' ? 'rgba(232,93,74,.25)' : 'rgba(232,93,74,.1)',
            color: '#e85d4a', display: 'inline-flex', alignItems: 'center', gap: '8px',
            opacity: loading !== null && loading !== 'clear' ? 0.5 : 1,
          }}
        >
          {loading === 'clear' ? '⏳ Limpando...' : '🗑 Limpar todos os dados'}
        </button>
      </div>

      <p style={{ fontSize: '11px', color: '#444', marginTop: '12px', lineHeight: 1.6 }}>
        Os dados de teste incluem: 7 clientes, 4 freelancers, 8 projetos (em todos os status),
        30+ transações (últimos 3 meses) e 8 eventos na agenda.
        A limpeza remove <strong style={{ color: '#666' }}>tudo</strong> exceto usuários.
      </p>
    </div>
  )
}
