'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

function fv(v: number) { return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }).format(v) }
function fd(d: string) { if (!d) return '—'; const [y, m, day] = d.split('-'); return `${day}/${m}/${y}` }

interface QuoteData {
  id: string; name: string; type?: string; value: number
  delivery_date?: string; description?: string; status: string
  clients?: { name: string; email?: string } | null
  data?: {
    custos?: { d: string; v: number }[]
    pgtos?: { d: string; v: number; dt: string; rec: boolean }[]
    diarias?: { desc: string; qtd: number; v: number }[]
    margem?: number
  }
}

const STATUS_LABEL: Record<string, string> = {
  orcamento: 'Aguardando aprovação',
  producao: 'Aprovado — Em produção',
  orcamento_desaprovado: 'Reprovado',
}

export default function QuotePublicPage() {
  const params = useParams()
  const token = params.token as string

  const [quote, setQuote] = useState<QuoteData | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [action, setAction] = useState<'approve' | 'reject' | null>(null)
  const [done, setDone] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    async function load() {
      const r = await fetch(`/api/quote/${token}`)
      if (!r.ok) { setNotFound(true); setLoading(false); return }
      const d = await r.json()
      setQuote(d)
      setLoading(false)
    }
    if (token) load()
  }, [token])

  async function handleAction(act: 'approve' | 'reject') {
    if (!confirm(act === 'approve' ? 'Confirmar aprovação do orçamento?' : 'Confirmar reprovação do orçamento?')) return
    setProcessing(true)
    const r = await fetch(`/api/quote/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: act }),
    })
    const d = await r.json()
    if (r.ok) {
      setDone(act === 'approve' ? 'aprovado' : 'reprovado')
      setQuote(q => q ? { ...q, status: d.status } : q)
    } else {
      alert(d.error || 'Erro ao processar')
    }
    setProcessing(false)
  }

  const isPending = quote?.status === 'orcamento'
  const isApproved = quote?.status === 'producao'
  const isRejected = quote?.status === 'orcamento_desaprovado'

  const custos = quote?.data?.custos || []
  const pgtos = quote?.data?.pgtos || []
  const diarias = quote?.data?.diarias || []
  const totalCustos = custos.reduce((s, c) => s + c.v, 0)

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555', fontFamily: "'DM Sans', sans-serif" }}>Carregando orçamento...</div>
    </div>
  )

  if (notFound) return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'DM Sans', sans-serif", padding: '20px' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '22px', color: '#f0ece4', marginBottom: '8px' }}>Orçamento não encontrado</h1>
        <p style={{ color: '#6b7280', fontSize: '14px' }}>Este link pode ter expirado ou ser inválido.</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />

      {/* Header */}
      <div style={{ background: '#111318', borderBottom: '1px solid #1f2229', padding: '16px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 800, fontSize: '20px', color: '#e8c547', letterSpacing: '-0.5px' }}>MOV.</div>
        <div style={{ fontSize: '12px', color: '#4b5563' }}>Proposta Comercial</div>
      </div>

      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '40px 20px' }}>
        {/* Status banner */}
        {done && (
          <div style={{ padding: '14px 20px', background: done === 'aprovado' ? 'rgba(93,184,122,.1)' : 'rgba(232,93,74,.1)', border: `1px solid ${done === 'aprovado' ? 'rgba(93,184,122,.3)' : 'rgba(232,93,74,.3)'}`, borderRadius: '10px', marginBottom: '24px', textAlign: 'center', color: done === 'aprovado' ? '#5db87a' : '#e85d4a', fontSize: '14px', fontWeight: 600 }}>
            {done === 'aprovado' ? '✅ Orçamento aprovado com sucesso! Entraremos em contato em breve.' : '❌ Orçamento reprovado. Obrigado pelo retorno.'}
          </div>
        )}

        {!isPending && !done && (
          <div style={{ padding: '12px 20px', background: isApproved ? 'rgba(93,184,122,.08)' : 'rgba(232,93,74,.08)', border: `1px solid ${isApproved ? 'rgba(93,184,122,.2)' : 'rgba(232,93,74,.2)'}`, borderRadius: '10px', marginBottom: '24px', textAlign: 'center', color: isApproved ? '#5db87a' : '#e85d4a', fontSize: '13px', fontWeight: 600 }}>
            {STATUS_LABEL[quote?.status || ''] || quote?.status}
          </div>
        )}

        {/* Project header */}
        <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '28px', marginBottom: '16px' }}>
          <div style={{ marginBottom: '20px' }}>
            {quote?.type && <div style={{ fontSize: '11px', color: '#e8c547', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>{quote.type}</div>}
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '24px', fontWeight: 800, color: '#f0ece4', lineHeight: 1.2, marginBottom: '8px' }}>{quote?.name}</h1>
            {quote?.clients?.name && <div style={{ fontSize: '13px', color: '#6b7280' }}>Para: <span style={{ color: '#9ca3af' }}>{quote.clients.name}</span></div>}
          </div>

          {quote?.description && (
            <p style={{ fontSize: '14px', color: '#9ca3af', lineHeight: 1.7, marginBottom: '20px' }}>{quote.description}</p>
          )}

          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            {quote?.delivery_date && (
              <div style={{ background: '#1a1d24', borderRadius: '8px', padding: '10px 16px' }}>
                <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Prazo de entrega</div>
                <div style={{ fontSize: '14px', color: '#f0ece4', fontWeight: 600 }}>{fd(quote.delivery_date)}</div>
              </div>
            )}
            <div style={{ background: '#1a1d24', borderRadius: '8px', padding: '10px 16px' }}>
              <div style={{ fontSize: '10px', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '4px' }}>Investimento total</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: '20px', color: '#e8c547', fontWeight: 800 }}>{fv(quote?.value || 0)}</div>
            </div>
          </div>
        </div>

        {/* Condições de pagamento */}
        {pgtos.length > 0 && (
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#f0ece4', marginBottom: '16px' }}>Condições de Pagamento</h3>
            {pgtos.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < pgtos.length - 1 ? '1px solid #1f2229' : 'none' }}>
                <div>
                  <div style={{ fontSize: '13px', color: '#f0ece4' }}>{p.d}</div>
                  {p.dt && <div style={{ fontSize: '11px', color: '#4b5563', marginTop: '2px' }}>Vencimento: {fd(p.dt)}</div>}
                </div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, fontSize: '15px', color: '#e8c547' }}>{fv(p.v)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Diárias/Serviços */}
        {diarias.length > 0 && (
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '24px', marginBottom: '16px' }}>
            <h3 style={{ fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 700, color: '#f0ece4', marginBottom: '16px' }}>Serviços Inclusos</h3>
            {diarias.map((d, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: i < diarias.length - 1 ? '1px solid #1f2229' : 'none' }}>
                <div style={{ fontSize: '13px', color: '#9ca3af' }}>{d.desc} {d.qtd > 1 ? `(${d.qtd}×)` : ''}</div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 600, fontSize: '13px', color: '#f0ece4' }}>{fv(d.v)}</div>
              </div>
            ))}
          </div>
        )}

        {/* CTA */}
        {isPending && !done && (
          <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '12px', padding: '28px', textAlign: 'center' }}>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>Revise os detalhes acima e dê seu retorno:</p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button onClick={() => handleAction('reject')} disabled={processing} style={{ padding: '12px 24px', background: 'rgba(232,93,74,.1)', border: '1px solid rgba(232,93,74,.3)', borderRadius: '8px', color: '#e85d4a', fontSize: '14px', fontWeight: 600, cursor: processing ? 'not-allowed' : 'pointer' }}>
                Reprovar orçamento
              </button>
              <button onClick={() => handleAction('approve')} disabled={processing} style={{ padding: '12px 28px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontFamily: "'Syne', sans-serif", fontSize: '14px', fontWeight: 800, cursor: processing ? 'not-allowed' : 'pointer' }}>
                {processing ? 'Processando...' : '✓ Aprovar orçamento'}
              </button>
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: '32px', fontSize: '11px', color: '#374151' }}>
          Proposta gerada por MOV Gestão · Sistema de gestão para produtoras
        </div>
      </div>
    </div>
  )
}
