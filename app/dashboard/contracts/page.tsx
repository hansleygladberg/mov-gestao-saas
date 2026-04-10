'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const TEMPLATE_KEY = 'mov_contract_template_v1'
const SETTINGS_KEY = 'mov_contract_settings_v1'

const DEFAULT_TEMPLATE = `CONTRATO DE PRESTAÇÃO DE SERVIÇOS AUDIOVISUAIS

Pelo presente instrumento particular, as partes abaixo qualificadas celebram o presente Contrato de Prestação de Serviços Audiovisuais, que se regerá pelas seguintes cláusulas e condições:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CONTRATANTE: {{contratante_nome}}
CPF/CNPJ: {{contratante_doc}}
Endereço: {{contratante_endereco}}

CONTRATADA: {{contratada_nome}}
CPF/CNPJ: {{contratada_doc}}
Endereço: {{contratada_endereco}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 1ª – DO OBJETO
O presente contrato tem por objeto a prestação dos seguintes serviços:

{{servicos}}

CLÁUSULA 2ª – DO PRAZO
Os serviços serão realizados no período de {{data_inicio}} a {{data_entrega}}, salvo por motivo de força maior devidamente comunicado e acordado entre as partes.

CLÁUSULA 3ª – DO VALOR E PAGAMENTO
Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de {{valor}}, da seguinte forma:

{{forma_pagamento}}

O não pagamento nas datas acordadas sujeitará a CONTRATANTE ao pagamento de multa de 2% sobre o valor em atraso, acrescida de juros de 1% ao mês.

CLÁUSULA 4ª – DAS OBRIGAÇÕES DA CONTRATADA
A CONTRATADA se compromete a:
a) Executar os serviços com qualidade e profissionalismo;
b) Entregar os materiais finalizados no prazo estipulado;
c) Manter sigilo absoluto sobre informações confidenciais da CONTRATANTE;
d) Utilizar equipamentos e softwares adequados à execução dos serviços.

CLÁUSULA 5ª – DAS OBRIGAÇÕES DA CONTRATANTE
A CONTRATANTE se compromete a:
a) Efetuar os pagamentos nos prazos e condições acordados;
b) Fornecer todas as informações, materiais e acessos necessários à execução dos serviços;
c) Revisar e aprovar entregas no prazo máximo de 5 (cinco) dias úteis após o recebimento;
d) Garantir acesso aos locais de captação, quando necessário.

CLÁUSULA 6ª – DOS DIREITOS AUTORAIS E PROPRIEDADE INTELECTUAL
Os materiais produzidos no âmbito deste contrato serão de propriedade exclusiva da CONTRATANTE após o pagamento integral do valor contratado. Até o pagamento integral, os direitos permanecem com a CONTRATADA.

CLÁUSULA 7ª – DAS REVISÕES
Estão incluídas no valor deste contrato até 2 (duas) rodadas de revisão do material entregue. Revisões adicionais serão cobradas separadamente mediante novo orçamento.

CLÁUSULA 8ª – DA RESCISÃO
O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio por escrito com antecedência mínima de 15 (quinze) dias. Em caso de rescisão por iniciativa da CONTRATANTE após o início dos trabalhos, serão devidos os valores proporcionais aos serviços já executados, acrescidos de multa rescisória de 20% sobre o valor total do contrato.

CLÁUSULA 9ª – CASO FORTUITO E FORÇA MAIOR
Nenhuma das partes será responsabilizada por atrasos ou descumprimentos decorrentes de caso fortuito ou força maior, desde que comunicados à outra parte no prazo de 48 horas.

CLÁUSULA 10ª – DAS DISPOSIÇÕES GERAIS
Este instrumento constitui o acordo integral entre as partes, substituindo quaisquer entendimentos anteriores, verbais ou escritos. Qualquer alteração deste contrato deverá ser feita por escrito e assinada por ambas as partes.

{{observacoes}}

CLÁUSULA 11ª – DO FORO
As partes elegem o foro da Comarca de {{cidade_foro}} para dirimir quaisquer dúvidas ou litígios oriundos do presente contrato, com renúncia expressa a qualquer outro, por mais privilegiado que seja.

{{cidade_data}}, {{data_assinatura}}.


_______________________________________________
{{contratante_nome}}
CONTRATANTE
CPF/CNPJ: {{contratante_doc}}


_______________________________________________
{{contratada_nome}}
CONTRATADA
CPF/CNPJ: {{contratada_doc}}


TESTEMUNHAS:

1. __________________________________________       2. __________________________________________
   Nome:                                               Nome:
   CPF:                                                CPF:
`

interface FormData {
  contratante_nome: string
  contratante_doc: string
  contratante_endereco: string
  contratada_nome: string
  contratada_doc: string
  contratada_endereco: string
  servicos: string
  valor: string
  forma_pagamento: string
  data_inicio: string
  data_entrega: string
  cidade_foro: string
  cidade_data: string
  data_assinatura: string
  observacoes: string
}

interface Settings {
  watermark: boolean
  logoUrl: string
  fontSize: number
}

const BLANK: FormData = {
  contratante_nome: '', contratante_doc: '', contratante_endereco: '',
  contratada_nome: '', contratada_doc: '', contratada_endereco: '',
  servicos: '', valor: '', forma_pagamento: '',
  data_inicio: '', data_entrega: '',
  cidade_foro: '', cidade_data: '', data_assinatura: '',
  observacoes: '',
}

function fd(d: string) {
  if (!d) return '___/___/______'
  return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR')
}

export default function ContractsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<FormData>(BLANK)
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE)
  const [editingTemplate, setEditingTemplate] = useState(false)
  const [settings, setSettings] = useState<Settings>({ watermark: false, logoUrl: '', fontSize: 13 })
  const [companyName, setCompanyName] = useState('')
  const [toast, setToast] = useState('')

  function showMsg(msg: string) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  useEffect(() => {
    const t = localStorage.getItem(TEMPLATE_KEY)
    if (t) setTemplate(t)
    const s = localStorage.getItem(SETTINGS_KEY)
    if (s) { try { setSettings(JSON.parse(s)) } catch {} }
  }, [])

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: ud } = await supabase.from('users').select('company_id').eq('id', user.id).single()
    if (ud?.company_id) {
      const { data: co } = await supabase.from('companies').select('name').eq('id', ud.company_id).single()
      if (co) setCompanyName(co.name)
    }
    setLoading(false)
  }, [router])

  useEffect(() => { load() }, [load])

  function saveTemplate() {
    localStorage.setItem(TEMPLATE_KEY, template)
    showMsg('✅ Modelo salvo!')
  }

  function resetTemplate() {
    if (!confirm('Restaurar o modelo padrão? As suas alterações serão perdidas.')) return
    setTemplate(DEFAULT_TEMPLATE)
    localStorage.setItem(TEMPLATE_KEY, DEFAULT_TEMPLATE)
    showMsg('Modelo restaurado ao padrão')
  }

  function saveSettings(s: Settings) {
    setSettings(s)
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
  }

  function f(key: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function renderContract() {
    let text = template
    const map: Record<string, string> = {
      ...form,
      data_inicio: fd(form.data_inicio),
      data_entrega: fd(form.data_entrega),
      data_assinatura: fd(form.data_assinatura),
    }
    for (const [k, v] of Object.entries(map)) {
      text = text.replaceAll(`{{${k}}}`, v || `{{${k}}}`)
    }
    return text
  }

  function printPDF() {
    window.print()
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '7px 10px', background: '#1a1d24',
    border: '1px solid #2a2d35', borderRadius: '7px', color: '#f0ece4',
    fontSize: '12px', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
  }
  const lbl: React.CSSProperties = {
    display: 'block', fontSize: '10px', color: '#555',
    textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: '4px',
  }
  const card: React.CSSProperties = {
    background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', padding: '16px',
  }
  const cardTitle: React.CSSProperties = {
    fontSize: '11px', fontWeight: 700, color: '#e8c547',
    textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '14px',
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0d0f12', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: '#555', fontSize: '13px' }}>Carregando...</div>
    </div>
  )

  const contractText = renderContract()

  return (
    <>
      {/* ── Print / PDF styles ────────────────────────────────────────── */}
      <style>{`
        #contract-print-root { display: none; }
        #contract-main-ui { display: block; }
        @media print {
          #contract-main-ui { display: none !important; }
          #contract-print-root { display: block !important; }
          @page { size: A4; margin: 20mm 25mm; }
        }
      `}</style>

      {/* ── Hidden print container ────────────────────────────────────── */}
      <div id="contract-print-root">
        <div style={{ position: 'relative', fontFamily: 'Georgia, serif', fontSize: `${settings.fontSize}px`, lineHeight: 1.9, color: '#000', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {settings.watermark && settings.logoUrl && (
            <div style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', zIndex: 0,
            }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={settings.logoUrl} alt="" style={{ width: '55%', opacity: 0.06, transform: 'rotate(-30deg)' }} />
            </div>
          )}
          <div style={{ position: 'relative', zIndex: 1 }}>{contractText}</div>
        </div>
      </div>

      {/* ── Main UI ───────────────────────────────────────────────────── */}
      <div id="contract-main-ui" style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '24px' }}>

        {toast && (
          <div style={{ position: 'fixed', top: 20, right: 20, background: '#111318', border: '1px solid #2a2d35', borderRadius: '8px', padding: '10px 18px', color: '#f0ece4', fontSize: '13px', zIndex: 9999 }}>
            {toast}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px', fontFamily: "'Montserrat', sans-serif" }}>📄 Contratos</h1>
            <p style={{ color: '#4b5563', fontSize: '12px' }}>Preencha os campos e gere o PDF do contrato</p>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setEditingTemplate(v => !v)}
              style={{ padding: '8px 16px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '8px', color: '#888', fontSize: '12px', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
            >
              {editingTemplate ? '👁 Ver Preview' : '✏️ Editar Modelo'}
            </button>
            <button
              onClick={printPDF}
              style={{ padding: '8px 22px', background: '#e8c547', border: 'none', borderRadius: '8px', color: '#000', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
            >
              📄 Gerar PDF
            </button>
          </div>
        </div>

        {/* Layout: form + preview */}
        <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '20px', alignItems: 'start' }}>

          {/* ── LEFT: Formulário ────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

            {/* Partes */}
            <div style={card}>
              <div style={cardTitle}>👥 Partes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={lbl}>Contratante (nome / razão social)</label>
                  <input style={inp} value={form.contratante_nome} onChange={e => f('contratante_nome', e.target.value)} placeholder="Nome ou razão social" />
                </div>
                <div>
                  <label style={lbl}>CPF / CNPJ do Contratante</label>
                  <input style={inp} value={form.contratante_doc} onChange={e => f('contratante_doc', e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label style={lbl}>Endereço do Contratante</label>
                  <input style={inp} value={form.contratante_endereco} onChange={e => f('contratante_endereco', e.target.value)} placeholder="Rua, nº, cidade – UF" />
                </div>

                <div style={{ borderTop: '1px solid #1f2229', paddingTop: '10px' }}>
                  <label style={lbl}>Contratada (nome / razão social)</label>
                  <input style={inp} value={form.contratada_nome} onChange={e => f('contratada_nome', e.target.value)} placeholder={companyName || 'Sua empresa'} />
                </div>
                <div>
                  <label style={lbl}>CPF / CNPJ da Contratada</label>
                  <input style={inp} value={form.contratada_doc} onChange={e => f('contratada_doc', e.target.value)} placeholder="00.000.000/0001-00" />
                </div>
                <div>
                  <label style={lbl}>Endereço da Contratada</label>
                  <input style={inp} value={form.contratada_endereco} onChange={e => f('contratada_endereco', e.target.value)} placeholder="Rua, nº, cidade – UF" />
                </div>
              </div>
            </div>

            {/* Serviços e Valores */}
            <div style={card}>
              <div style={cardTitle}>💼 Serviços e Valores</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div>
                  <label style={lbl}>Serviços prestados</label>
                  <textarea
                    style={{ ...inp, minHeight: '80px', resize: 'vertical' }}
                    value={form.servicos}
                    onChange={e => f('servicos', e.target.value)}
                    placeholder="Ex: Produção de vídeo institucional – pré-produção, captação (1 dia) e edição completa com até 2 revisões."
                  />
                </div>
                <div>
                  <label style={lbl}>Valor total</label>
                  <input style={inp} value={form.valor} onChange={e => f('valor', e.target.value)} placeholder="R$ 5.000,00" />
                </div>
                <div>
                  <label style={lbl}>Forma de pagamento</label>
                  <textarea
                    style={{ ...inp, minHeight: '60px', resize: 'vertical' }}
                    value={form.forma_pagamento}
                    onChange={e => f('forma_pagamento', e.target.value)}
                    placeholder="50% na assinatura (R$ 2.500,00) e 50% na entrega final (R$ 2.500,00)."
                  />
                </div>
              </div>
            </div>

            {/* Datas e Local */}
            <div style={card}>
              <div style={cardTitle}>📅 Datas e Local</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={lbl}>Início dos serviços</label>
                  <input type="date" style={inp} value={form.data_inicio} onChange={e => f('data_inicio', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Entrega final</label>
                  <input type="date" style={inp} value={form.data_entrega} onChange={e => f('data_entrega', e.target.value)} />
                </div>
                <div>
                  <label style={lbl}>Cidade do foro</label>
                  <input style={inp} value={form.cidade_foro} onChange={e => f('cidade_foro', e.target.value)} placeholder="São Paulo" />
                </div>
                <div>
                  <label style={lbl}>Cidade (assinatura)</label>
                  <input style={inp} value={form.cidade_data} onChange={e => f('cidade_data', e.target.value)} placeholder="São Paulo" />
                </div>
              </div>
              <div style={{ marginTop: '10px' }}>
                <label style={lbl}>Data de assinatura</label>
                <input type="date" style={inp} value={form.data_assinatura} onChange={e => f('data_assinatura', e.target.value)} />
              </div>
            </div>

            {/* Observações */}
            <div style={card}>
              <div style={cardTitle}>📝 Cláusulas adicionais</div>
              <textarea
                style={{ ...inp, minHeight: '80px', resize: 'vertical' }}
                value={form.observacoes}
                onChange={e => f('observacoes', e.target.value)}
                placeholder="Condições especiais, cláusulas adicionais ou informações complementares..."
              />
            </div>

            {/* Configurações PDF */}
            <div style={card}>
              <div style={cardTitle}>⚙️ Configurações do PDF</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>

                <div>
                  <label style={lbl}>Tamanho da fonte</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <input
                      type="range" min="10" max="16" value={settings.fontSize}
                      onChange={e => saveSettings({ ...settings, fontSize: Number(e.target.value) })}
                      style={{ flex: 1, accentColor: '#e8c547' }}
                    />
                    <span style={{ color: '#888', fontSize: '12px', minWidth: '32px' }}>{settings.fontSize}px</span>
                  </div>
                </div>

                <div>
                  <label style={{ ...lbl, marginBottom: '8px' }}>Marca d'água com logo</label>
                  <button
                    onClick={() => saveSettings({ ...settings, watermark: !settings.watermark })}
                    style={{
                      padding: '6px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer',
                      border: 'none', fontFamily: "'Montserrat', sans-serif", fontWeight: 600,
                      background: settings.watermark ? 'rgba(93,184,122,.15)' : '#1a1d24',
                      color: settings.watermark ? '#5db87a' : '#6b7280',
                    }}
                  >
                    {settings.watermark ? '✅ Ativada' : '○ Desativada'}
                  </button>

                  {settings.watermark && (
                    <div style={{ marginTop: '10px' }}>
                      <label style={lbl}>URL da logo (PNG ou SVG)</label>
                      <input
                        style={inp}
                        value={settings.logoUrl}
                        onChange={e => saveSettings({ ...settings, logoUrl: e.target.value })}
                        placeholder="https://... ou /img/logo.png"
                      />
                      <div style={{ fontSize: '11px', color: '#3a3a3a', marginTop: '4px' }}>
                        Use /img/logo.png se a logo estiver na pasta public/img
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <button
              onClick={() => setForm(BLANK)}
              style={{ padding: '8px', background: 'transparent', border: '1px solid #1f2229', borderRadius: '8px', color: '#4b5563', fontSize: '12px', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
            >
              🗑 Limpar campos
            </button>
          </div>

          {/* ── RIGHT: Preview ou Editor de Modelo ──────────────────── */}
          <div>
            {editingTemplate ? (
              /* Editor de modelo */
              <div style={card}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>✏️ Editar Modelo</div>
                    <div style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.5 }}>
                      Use <code style={{ background: '#1a1d24', padding: '1px 5px', borderRadius: '4px', color: '#e8c547' }}>{'{{campo}}'}</code> para campos dinâmicos.
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={resetTemplate}
                      style={{ padding: '6px 12px', background: 'transparent', border: '1px solid #2a2d35', borderRadius: '6px', color: '#555', fontSize: '11px', cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                    >
                      ↺ Padrão
                    </button>
                    <button
                      onClick={saveTemplate}
                      style={{ padding: '6px 14px', background: '#e8c547', border: 'none', borderRadius: '6px', color: '#000', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                    >
                      💾 Salvar
                    </button>
                  </div>
                </div>

                <textarea
                  style={{ ...inp, minHeight: '640px', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.6', resize: 'vertical' }}
                  value={template}
                  onChange={e => setTemplate(e.target.value)}
                />

                <div style={{ marginTop: '12px', padding: '10px 12px', background: '#0d0f12', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', color: '#4b5563', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Campos disponíveis</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                    {['contratante_nome','contratante_doc','contratante_endereco','contratada_nome','contratada_doc','contratada_endereco','servicos','valor','forma_pagamento','data_inicio','data_entrega','cidade_foro','cidade_data','data_assinatura','observacoes'].map(k => (
                      <code
                        key={k}
                        onClick={() => { navigator.clipboard.writeText(`{{${k}}}`); showMsg(`Copiado: {{${k}}}`) }}
                        style={{ background: '#1a1d24', border: '1px solid #2a2d35', padding: '2px 7px', borderRadius: '4px', fontSize: '11px', color: '#e8c547', cursor: 'pointer' }}
                        title="Clique para copiar"
                      >
                        {`{{${k}}}`}
                      </code>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              /* Preview do contrato */
              <div style={{ background: '#111318', border: '1px solid #1f2229', borderRadius: '10px', overflow: 'hidden' }}>
                {/* Preview header */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #1f2229', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0d0f12' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#5db87a', display: 'inline-block' }} />
                    <span style={{ fontSize: '12px', color: '#555' }}>Preview — A4</span>
                  </div>
                  <button
                    onClick={printPDF}
                    style={{ padding: '6px 16px', background: '#e8c547', border: 'none', borderRadius: '6px', color: '#000', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: "'Montserrat', sans-serif" }}
                  >
                    📄 Gerar PDF
                  </button>
                </div>

                {/* Contract sheet */}
                <div style={{ padding: '16px', background: '#1a1d24' }}>
                  <div style={{
                    position: 'relative', background: 'white',
                    padding: '50px 60px', minHeight: '900px',
                    boxShadow: '0 4px 24px rgba(0,0,0,.5)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}>
                    {/* Watermark preview */}
                    {settings.watermark && settings.logoUrl && (
                      <div style={{
                        position: 'absolute', inset: 0,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        pointerEvents: 'none', userSelect: 'none', zIndex: 0,
                      }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={settings.logoUrl} alt="" style={{ width: '55%', opacity: 0.06, transform: 'rotate(-30deg)' }} />
                      </div>
                    )}
                    {/* Contract text */}
                    <div style={{
                      position: 'relative', zIndex: 1,
                      fontFamily: 'Georgia, serif',
                      fontSize: `${settings.fontSize}px`,
                      lineHeight: 1.9,
                      color: '#1a1a1a',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {contractText}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
