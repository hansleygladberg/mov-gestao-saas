export default function TrashPage() {
  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Lixeira</h1>
        <p style={{ color: '#4b5563', fontSize: '13px' }}>Itens excluídos recentemente</p>
      </div>
      <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '60px', textAlign: 'center' }}>
        <div style={{ fontSize: '36px', marginBottom: '12px' }}>🗑️</div>
        <div style={{ fontSize: '15px', color: '#6b7280', marginBottom: '6px' }}>Lixeira vazia</div>
        <div style={{ fontSize: '13px', color: '#4b5563' }}>Itens excluídos aparecerão aqui em breve</div>
      </div>
    </div>
  )
}
