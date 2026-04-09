'use client'

/**
 * Página exibida quando a conta está suspensa ou cancelada.
 * O middleware redireciona para cá automaticamente.
 */
export default function SuspendedPage() {
  return (
    <div style={{
      fontFamily: "'Montserrat', sans-serif",
      background: '#0a0a0a',
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#111318',
        border: '1px solid #2a2d35',
        borderRadius: '16px',
        padding: '48px 40px',
        maxWidth: '480px',
        width: '100%',
        textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚫</div>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#f0ece4', marginBottom: '12px' }}>
          Conta suspensa
        </h1>
        <p style={{ fontSize: '14px', color: '#6b7280', lineHeight: 1.6, marginBottom: '28px' }}>
          Sua conta está suspensa devido a uma pendência de pagamento ou cancelamento.
          Entre em contato para regularizar e recuperar o acesso.
        </p>
        <a
          href="mailto:contato@mov.com?subject=Reativação de conta"
          style={{
            display: 'inline-block',
            padding: '12px 28px',
            background: '#e8c547',
            color: '#000',
            borderRadius: '8px',
            fontWeight: 700,
            fontSize: '14px',
            textDecoration: 'none',
          }}
        >
          📩 Entrar em contato
        </a>
        <div style={{ marginTop: '20px' }}>
          <a
            href="/login"
            style={{ fontSize: '12px', color: '#4b5563', textDecoration: 'none' }}
          >
            Usar outra conta →
          </a>
        </div>
      </div>
    </div>
  )
}
