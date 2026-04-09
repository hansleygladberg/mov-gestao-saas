'use client'

import { useState } from 'react'

export default function BackupPanel() {
  const [loading, setLoading] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)

  async function handleBackup() {
    setLoading(true)
    try {
      const res = await fetch('/api/backup')
      if (!res.ok) {
        const err = await res.json()
        alert('Erro: ' + (err.error || 'Falha ao gerar backup'))
        return
      }

      const blob = await res.blob()
      const disposition = res.headers.get('Content-Disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `backup-mov-${new Date().toISOString().slice(0, 10)}.json`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setLastBackup(new Date().toLocaleString('pt-BR'))
    } catch {
      alert('Erro ao gerar backup. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '20px', flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <span style={{ fontSize: '20px' }}>🗄️</span>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: '15px', color: '#f0ece4' }}>
              Backup do banco de dados
            </span>
          </div>
          <p style={{ fontSize: '13px', color: '#4b5563', lineHeight: 1.5, maxWidth: '480px' }}>
            Gera um arquivo <strong style={{ color: '#888' }}>.json</strong> com todos os dados da empresa — projetos, clientes, transações, eventos, freelancers e locadoras. Use para migrar para outro banco ou guardar como segurança.
          </p>
          {lastBackup && (
            <p style={{ fontSize: '11px', color: '#5db87a', marginTop: '8px' }}>
              ✓ Último backup: {lastBackup}
            </p>
          )}
        </div>

        <button
          onClick={handleBackup}
          disabled={loading}
          style={{
            padding: '10px 20px',
            background: loading ? '#1a1d24' : '#e8c547',
            color: loading ? '#4b5563' : '#000',
            border: loading ? '1px solid #2a2d35' : 'none',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            transition: 'background .15s',
          }}
        >
          {loading ? (
            <>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid #4b5563', borderTopColor: '#888', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              Gerando...
            </>
          ) : (
            <>⬇️ Baixar Backup</>
          )}
        </button>
      </div>

      <div style={{ marginTop: '16px', padding: '12px 14px', background: '#0d0f12', borderRadius: '8px', border: '1px solid #1f2229' }}>
        <p style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.6 }}>
          <strong style={{ color: '#6b7280' }}>O arquivo inclui:</strong> empresa, usuários, projetos (com custos/pagamentos/diárias), clientes, transações financeiras, eventos da agenda, freelancers e empresas de locação.
          <br />
          <strong style={{ color: '#6b7280' }}>Restaurar:</strong> compartilhe o arquivo com uma IA e peça para ela criar os INSERT SQL para o Supabase, ou use o script de restore que acompanha a documentação do projeto.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
