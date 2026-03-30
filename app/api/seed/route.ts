import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

async function getCallerAndCompany(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('users').select('company_id, role').eq('id', user.id).single()
  if (!data || data.role !== 'admin') return null
  return { userId: user.id, companyId: data.company_id }
}

// POST /api/seed → insere dados fictícios
export async function POST() {
  const supabase = await createClient()
  const caller = await getCallerAndCompany(supabase)
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const cid = caller.companyId

  // ── 1. Clientes ──────────────────────────────────────────────────
  const { data: clients, error: cErr } = await supabase.from('clients').insert([
    { company_id: cid, name: 'Saúde Total', segment: 'Saúde', whatsapp: '(85) 9 9001-0001', email: 'mkt@saudetotal.com.br', monthly_value: 4500 },
    { company_id: cid, name: 'Edu Conecta', segment: 'Educação', whatsapp: '(85) 9 9002-0002', email: 'contato@educonecta.com', monthly_value: 3200 },
    { company_id: cid, name: 'Verve Moda', segment: 'Moda & Lifestyle', whatsapp: '(11) 9 8888-4444', email: 'marketing@verve.com.br', monthly_value: 0 },
    { company_id: cid, name: 'Construfort', segment: 'Construção Civil', whatsapp: '(85) 9 9004-4444', email: 'obras@construfort.com', monthly_value: 6000 },
    { company_id: cid, name: 'Café do Porto', segment: 'Alimentação', whatsapp: '(85) 9 7777-3333', email: 'info@cafedoporto.com.br', monthly_value: 1800 },
    { company_id: cid, name: 'FitLife Academia', segment: 'Fitness', whatsapp: '(85) 9 6666-2222', email: 'social@fitlife.com', monthly_value: 2400 },
    { company_id: cid, name: 'TechForce', segment: 'Tecnologia', whatsapp: '(11) 9 5555-1111', email: 'mkt@techforce.io', monthly_value: 0 },
  ]).select()

  if (cErr) return NextResponse.json({ error: 'Erro ao criar clientes: ' + cErr.message }, { status: 500 })

  const [saudeTotal, eduConecta, verve, construfort, cafe, fitlife, techforce] = clients!

  // ── 2. Freelancers ───────────────────────────────────────────────
  await supabase.from('freelancers').insert([
    { company_id: cid, name: 'Lucas Mendes', area: 'Câmera', phone: '(85) 9 9100-0001', daily_rate: 600 },
    { company_id: cid, name: 'Ana Beatriz', area: 'Edição', phone: '(85) 9 9100-0002', daily_rate: 450 },
    { company_id: cid, name: 'Pedro Alves', area: 'Drone', phone: '(85) 9 9100-0003', daily_rate: 700 },
    { company_id: cid, name: 'Carla Rocha', area: 'Motion', phone: '(85) 9 9100-0004', daily_rate: 500 },
  ])

  // ── 3. Projetos ──────────────────────────────────────────────────
  const today = new Date()
  const dt = (offsetDays: number) => {
    const d = new Date(today)
    d.setDate(d.getDate() + offsetDays)
    return d.toISOString().split('T')[0]
  }

  const { error: pErr } = await supabase.from('projects').insert([
    {
      company_id: cid, client_id: saudeTotal.id,
      name: 'Campanha Institucional Saúde Total', type: 'Vídeo Institucional',
      status: 'producao', value: 12000, delivery_date: dt(15), progress: 40,
      description: 'Série de 3 vídeos institucionais para redes sociais.',
      data: {
        custos: [{ d: 'Locação de estúdio', v: 800 }, { d: 'Figurino', v: 300 }],
        pgtos: [{ d: 'Entrada 50%', v: 6000, dt: dt(-10), rec: true }, { d: 'Final', v: 6000, dt: dt(15), rec: false }],
        diarias: [{ desc: 'Captação', qtd: 2, v: 1200 }],
        margem: 30,
      },
    },
    {
      company_id: cid, client_id: construfort.id,
      name: 'Mini Doc Obra Residencial', type: 'Documentário',
      status: 'edicao', value: 8500, delivery_date: dt(7), progress: 75,
      description: 'Documentário de 5 min mostrando o processo de construção.',
      data: {
        custos: [{ d: 'Drone', v: 400 }],
        pgtos: [{ d: 'Sinal', v: 3000, dt: dt(-20), rec: true }, { d: 'Entrega', v: 5500, dt: dt(7), rec: false }],
        diarias: [{ desc: 'Captação', qtd: 3, v: 1800 }],
        margem: 35,
      },
    },
    {
      company_id: cid, client_id: verve.id,
      name: 'Lookbook Coleção Verão', type: 'Fashion Film',
      status: 'entregue', value: 15000, delivery_date: dt(-5), progress: 100,
      description: 'Vídeo para o lançamento da coleção verão da Verve Moda.',
      data: {
        custos: [{ d: 'Locação', v: 1500 }, { d: 'Modelos', v: 2000 }, { d: 'Maquiagem', v: 600 }],
        pgtos: [{ d: 'Entrada', v: 7500, dt: dt(-30), rec: true }, { d: 'Final', v: 7500, dt: dt(-5), rec: true }],
        diarias: [{ desc: 'Set dia 1', qtd: 1, v: 1200 }, { desc: 'Set dia 2', qtd: 1, v: 1200 }],
        margem: 45,
      },
    },
    {
      company_id: cid, client_id: eduConecta.id,
      name: 'Vídeos Aulas Plataforma EAD', type: 'Conteúdo EAD',
      status: 'producao', value: 22000, delivery_date: dt(30), progress: 25,
      description: '10 videoaulas de 15 min para plataforma de ensino online.',
      data: {
        custos: [{ d: 'Teleprompter', v: 200 }, { d: 'Chroma key', v: 500 }],
        pgtos: [{ d: '1ª parcela', v: 8000, dt: dt(-15), rec: true }, { d: '2ª parcela', v: 7000, dt: dt(15), rec: false }, { d: 'Final', v: 7000, dt: dt(30), rec: false }],
        diarias: [{ desc: 'Gravação estúdio', qtd: 5, v: 3000 }],
        margem: 40,
      },
    },
    {
      company_id: cid, client_id: cafe.id,
      name: 'Reels Cafés Especiais', type: 'Social Media',
      status: 'orcamento', value: 4800, delivery_date: dt(20), progress: 0,
      description: 'Pacote de 8 reels mensais para Instagram e TikTok.',
      data: { custos: [], pgtos: [], diarias: [], margem: 50 },
    },
    {
      company_id: cid, client_id: fitlife.id,
      name: 'Filme Publicitário FitLife', type: 'Comercial TV',
      status: 'orcamento', value: 35000, delivery_date: dt(45), progress: 0,
      description: 'Comercial de 30s para TV regional e YouTube.',
      data: { custos: [], pgtos: [], diarias: [], margem: 0 },
    },
    {
      company_id: cid, client_id: techforce.id,
      name: 'Brand Film TechForce', type: 'Vídeo Institucional',
      status: 'pausado', value: 18000, delivery_date: dt(60), progress: 15,
      description: 'Vídeo de identidade da marca para o site.',
      data: {
        custos: [{ d: 'Roteiro', v: 800 }],
        pgtos: [{ d: 'Sinal', v: 5000, dt: dt(-40), rec: true }],
        diarias: [],
        margem: 0,
      },
    },
    {
      company_id: cid, client_id: saudeTotal.id,
      name: 'Conteúdo Mensal — Saúde Total', type: 'Social Media',
      status: 'producao', value: 4500, delivery_date: dt(3), progress: 80,
      description: 'Produção mensal de conteúdo para redes sociais (contrato fixo).',
      data: { custos: [], pgtos: [{ d: 'Mensal', v: 4500, dt: dt(-1), rec: false }], diarias: [{ desc: 'Captação', qtd: 1, v: 600 }], margem: 60 },
    },
  ])

  if (pErr) return NextResponse.json({ error: 'Erro ao criar projetos: ' + pErr.message }, { status: 500 })

  // ── 4. Transações ────────────────────────────────────────────────
  const m = (offsetMonths: number, day: number) => {
    const d = new Date(today.getFullYear(), today.getMonth() + offsetMonths, day)
    return d.toISOString().split('T')[0]
  }

  await supabase.from('transactions').insert([
    // Mês atual
    { company_id: cid, type: 'entrada', value: 6000, description: 'Entrada Campanha Saúde Total', category: 'Projetos', transaction_date: m(0, 5) },
    { company_id: cid, type: 'entrada', value: 4500, description: 'Contrato fixo Saúde Total', category: 'Contratos fixos', transaction_date: m(0, 1) },
    { company_id: cid, type: 'entrada', value: 3200, description: 'Contrato fixo Edu Conecta', category: 'Contratos fixos', transaction_date: m(0, 1) },
    { company_id: cid, type: 'entrada', value: 6000, description: 'Contrato fixo Construfort', category: 'Contratos fixos', transaction_date: m(0, 1) },
    { company_id: cid, type: 'entrada', value: 1800, description: 'Contrato fixo Café do Porto', category: 'Contratos fixos', transaction_date: m(0, 1) },
    { company_id: cid, type: 'entrada', value: 2400, description: 'Contrato fixo FitLife', category: 'Contratos fixos', transaction_date: m(0, 1) },
    { company_id: cid, type: 'arec', value: 5500, description: 'Final Mini Doc Construfort', category: 'Projetos', transaction_date: m(0, 15) },
    { company_id: cid, type: 'arec', value: 4500, description: 'Mensalidade Saúde Total', category: 'Contratos fixos', transaction_date: m(0, 28) },
    { company_id: cid, type: 'saida', value: 1500, description: 'Freelancer Lucas Mendes', category: 'Freelancers', transaction_date: m(0, 8) },
    { company_id: cid, type: 'saida', value: 900, description: 'Freelancer Ana Beatriz', category: 'Freelancers', transaction_date: m(0, 10) },
    { company_id: cid, type: 'saida', value: 380, description: 'Adobe Creative Cloud', category: 'Softwares', transaction_date: m(0, 5) },
    { company_id: cid, type: 'saida', value: 650, description: 'Locação de equipamentos', category: 'Equipamentos', transaction_date: m(0, 12) },
    { company_id: cid, type: 'apag', value: 1200, description: 'Freelancer Pedro Alves (drone)', category: 'Freelancers', transaction_date: m(0, 20) },

    // Mês anterior
    { company_id: cid, type: 'entrada', value: 7500, description: 'Lookbook Verve — entrada', category: 'Projetos', transaction_date: m(-1, 2) },
    { company_id: cid, type: 'entrada', value: 7500, description: 'Lookbook Verve — final', category: 'Projetos', transaction_date: m(-1, 25) },
    { company_id: cid, type: 'entrada', value: 4500, description: 'Contrato fixo Saúde Total', category: 'Contratos fixos', transaction_date: m(-1, 1) },
    { company_id: cid, type: 'entrada', value: 3200, description: 'Contrato fixo Edu Conecta', category: 'Contratos fixos', transaction_date: m(-1, 1) },
    { company_id: cid, type: 'entrada', value: 3000, description: 'Sinal Mini Doc Construfort', category: 'Projetos', transaction_date: m(-1, 10) },
    { company_id: cid, type: 'entrada', value: 8000, description: '1ª parcela EAD Edu Conecta', category: 'Projetos', transaction_date: m(-1, 15) },
    { company_id: cid, type: 'saida', value: 2400, description: 'Modelos e produção Verve', category: 'Produção', transaction_date: m(-1, 5) },
    { company_id: cid, type: 'saida', value: 1500, description: 'Locação estúdio Verve', category: 'Locação', transaction_date: m(-1, 3) },
    { company_id: cid, type: 'saida', value: 380, description: 'Adobe Creative Cloud', category: 'Softwares', transaction_date: m(-1, 5) },
    { company_id: cid, type: 'saida', value: 1200, description: 'Freelancer Lucas Mendes', category: 'Freelancers', transaction_date: m(-1, 8) },
    { company_id: cid, type: 'saida', value: 900, description: 'Internet e telefonia', category: 'Infraestrutura', transaction_date: m(-1, 15) },

    // Dois meses atrás
    { company_id: cid, type: 'entrada', value: 5000, description: 'Sinal Brand Film TechForce', category: 'Projetos', transaction_date: m(-2, 8) },
    { company_id: cid, type: 'entrada', value: 4500, description: 'Contrato fixo Saúde Total', category: 'Contratos fixos', transaction_date: m(-2, 1) },
    { company_id: cid, type: 'entrada', value: 6000, description: 'Contrato fixo Construfort', category: 'Contratos fixos', transaction_date: m(-2, 1) },
    { company_id: cid, type: 'saida', value: 4800, description: 'Câmera Sony FX3 (aluguel mensal)', category: 'Equipamentos', transaction_date: m(-2, 5) },
    { company_id: cid, type: 'saida', value: 380, description: 'Adobe Creative Cloud', category: 'Softwares', transaction_date: m(-2, 5) },
    { company_id: cid, type: 'saida', value: 800, description: 'Roteiro Brand Film', category: 'Produção', transaction_date: m(-2, 12) },
  ])

  // ── 5. Eventos ───────────────────────────────────────────────────
  await supabase.from('events').insert([
    { company_id: cid, title: 'Captação Saúde Total — dia 1', event_type: 'capt', event_date: dt(3), notes: 'Clínica Centro — trazer kit completo' },
    { company_id: cid, title: 'Captação Saúde Total — dia 2', event_type: 'capt', event_date: dt(4), notes: 'Clínica Aldeota — depoimentos' },
    { company_id: cid, title: 'Entrega Mini Doc Construfort', event_type: 'entrega', event_date: dt(7), notes: 'Enviar via WeTransfer + apresentação' },
    { company_id: cid, title: 'Reunião EAD Edu Conecta', event_type: 'manual', event_date: dt(10), notes: 'Alinhamento roteiros das aulas 6-10' },
    { company_id: cid, title: 'Gravação EAD — Semana 1', event_type: 'capt', event_date: dt(14), notes: 'Aulas 1 a 5 — estúdio interno' },
    { company_id: cid, title: 'Entrega Conteúdo Mensal Saúde Total', event_type: 'entrega', event_date: dt(3), notes: '8 posts + 4 reels — drive compartilhado' },
    { company_id: cid, title: 'Reels Café do Porto', event_type: 'capt', event_date: dt(21), notes: 'Captação de produto e ambiente — café Iracema' },
    { company_id: cid, title: 'Reunião Orçamento FitLife', event_type: 'manual', event_date: dt(5), notes: 'Apresentar proposta comercial' },
  ])

  return NextResponse.json({ ok: true, message: 'Dados de teste inseridos com sucesso!' })
}

// DELETE /api/seed → remove todos os dados da empresa (exceto usuários)
export async function DELETE() {
  const supabase = await createClient()
  const caller = await getCallerAndCompany(supabase)
  if (!caller) return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const cid = caller.companyId

  // Apaga na ordem certa (respeitando FK)
  await supabase.from('events').delete().eq('company_id', cid)
  await supabase.from('transactions').delete().eq('company_id', cid)
  await supabase.from('projects').delete().eq('company_id', cid)
  await supabase.from('clients').delete().eq('company_id', cid)
  await supabase.from('freelancers').delete().eq('company_id', cid)

  return NextResponse.json({ ok: true, message: 'Todos os dados foram removidos.' })
}
