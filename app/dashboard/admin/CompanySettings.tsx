'use client'

import { useState, useEffect, useCallback } from 'react'

interface Settings {
  captacoes: string[]
  tiposProjeto: string[]
  segmentos: string[]
  categoriasFinanceiras: string[]
  categoriasCusto: string[]
  statusProjeto: string[]
}

const DEFAULT: Settings = {
  captacoes: ['Tráfego', 'Site', 'Google', 'Indicação'],
  tiposProjeto: ['Corporativo', 'Evento', 'Institucional', 'Casamento', 'Publicitário', 'Redes Sociais', 'Documentário', 'Making Of', 'Drone'],
  segmentos: ['Saúde', 'Advocacia', 'Educação', 'Eventos', 'Governo', 'Corporativo', 'Casamento', 'Gastronomia', 'Fitness', 'Outro'],
  categoriasFinanceiras: ['Projeto', 'Equipamento', 'Freelancer', 'Software', 'Transporte', 'Alimentação', 'Estacionamento', 'Aluguel Equipamento', 'Marketing', 'Outro'],
  categoriasCusto: ['Freela', 'Transporte', 'Estacionamento', 'Alimentação', 'Equipamento', 'Locação', 'Outro'],
  statusProjeto: ['Orçamento', 'Em Produção', 'Edição', 'Aguardando Cliente', 'Revisão', 'Aprovado', 'Finalizado'],
}

const inp: React.CSSProperties = {
  flex: 1, padding: '8px 12px', background: '#1a1d24', border: '1px solid #2a2d35',
  borderRadius: '8px', color: '#f0ece4', fontSize: '13px', outline: 'none',
}

function TagList({
  title, items, onAdd, onRemove, placeholder,
}: {
  title: string; items: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void; placeholder: string
}) {
  const [input, setInput] = useState('')

  function add() {
    const v = input.trim()
    if (!v || items.includes(v)) return
    onAdd(v)
    setInput('')
  }

  return (
    <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '20px', marginBottom: '12px' }}>
      <h3 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '14px', fontWeight: 600, color: '#f0ece4', marginBottom: '14px' }}>{title}</h3>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
        {items.map(item => (
          <span key={item} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: '#1a1d24', border: '1px solid #2a2d35', borderRadius: '20px', fontSize: '12px', color: '#d1d5db', fontWeight: 500 }}>
            {item}
            <button onClick={() => onRemove(item)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 0 0 2px', display: 'flex', alignItems: 'center' }}>×</button>
          </span>
        ))}
        {items.length === 0 && <span style={{ fontSize: '12px', color: '#4b5563' }}>Nenhum item cadastrado</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <input
          style={inp}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={placeholder}
        />
        <button onClick={add} style={{ padding: '8px 18px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          Adicionar
        </button>
      </div>
    </div>
  )
}

export default function CompanySettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 3000) }

  const load = useCallback(async () => {
    setLoading(true)
    const r = await fetch('/api/company-settings')
    if (r.ok) { const d = await r.json(); setSettings({ ...DEFAULT, ...d }) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function save(updated: Settings) {
    setSaving(true)
    try {
      const r = await fetch('/api/company-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      })
      if (!r.ok) throw new Error('Erro ao salvar')
      showToast('Configurações salvas!')
    } catch { showToast('Erro ao salvar') }
    finally { setSaving(false) }
  }

  function addItem(key: keyof Settings, value: string) {
    const updated = { ...settings, [key]: [...(settings[key] as string[]), value] }
    setSettings(updated)
    save(updated)
  }

  function removeItem(key: keyof Settings, value: string) {
    const updated = { ...settings, [key]: (settings[key] as string[]).filter(i => i !== value) }
    setSettings(updated)
    save(updated)
  }

  if (loading) return <div style={{ color: '#555', fontSize: '13px', padding: '20px 0' }}>Carregando configurações...</div>

  return (
    <div>
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 18px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>
          {saving ? '⏳ Salvando...' : toast}
        </div>
      )}

      <TagList
        title="Formas de Captação"
        items={settings.captacoes}
        placeholder="Nova forma..."
        onAdd={v => addItem('captacoes', v)}
        onRemove={v => removeItem('captacoes', v)}
      />
      <TagList
        title="Tipos de Projeto"
        items={settings.tiposProjeto}
        placeholder="Novo tipo..."
        onAdd={v => addItem('tiposProjeto', v)}
        onRemove={v => removeItem('tiposProjeto', v)}
      />
      <TagList
        title="Segmentos de Cliente"
        items={settings.segmentos}
        placeholder="Novo segmento..."
        onAdd={v => addItem('segmentos', v)}
        onRemove={v => removeItem('segmentos', v)}
      />
      <TagList
        title="Categorias Financeiras"
        items={settings.categoriasFinanceiras}
        placeholder="Nova categoria..."
        onAdd={v => addItem('categoriasFinanceiras', v)}
        onRemove={v => removeItem('categoriasFinanceiras', v)}
      />
      <TagList
        title="Categorias de Custo"
        items={settings.categoriasCusto}
        placeholder="Nova categoria..."
        onAdd={v => addItem('categoriasCusto', v)}
        onRemove={v => removeItem('categoriasCusto', v)}
      />
      <TagList
        title="Status do Projeto (Pipeline)"
        items={settings.statusProjeto}
        placeholder="Novo status..."
        onAdd={v => addItem('statusProjeto', v)}
        onRemove={v => removeItem('statusProjeto', v)}
      />
    </div>
  )
}
