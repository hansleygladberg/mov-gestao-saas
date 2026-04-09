import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: userData } = await supabase.from('users').select('*').eq('id', user.id).single()
    if (!userData || userData.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas admins podem gerar backup' }, { status: 403 })
    }

    const admin = createAdminClient()
    const companyId = userData.company_id

    const [
      { data: company },
      { data: users },
      { data: projects },
      { data: clients },
      { data: transactions },
      { data: events },
      { data: freelancers },
      { data: rentalCompanies },
    ] = await Promise.all([
      admin.from('companies').select('*').eq('id', companyId).single(),
      admin.from('users').select('*').eq('company_id', companyId),
      admin.from('projects').select('*').eq('company_id', companyId),
      admin.from('clients').select('*').eq('company_id', companyId),
      admin.from('transactions').select('*').eq('company_id', companyId),
      admin.from('events').select('*').eq('company_id', companyId),
      admin.from('freelancers').select('*').eq('company_id', companyId),
      admin.from('rental_companies').select('*').eq('company_id', companyId),
    ])

    const backup = {
      _meta: {
        version: '1.0',
        generated_at: new Date().toISOString(),
        company_id: companyId,
        company_name: company?.name || 'Desconhecida',
        total_records: {
          users: users?.length || 0,
          projects: projects?.length || 0,
          clients: clients?.length || 0,
          transactions: transactions?.length || 0,
          events: events?.length || 0,
          freelancers: freelancers?.length || 0,
          rental_companies: rentalCompanies?.length || 0,
        },
      },
      company,
      users,
      projects,
      clients,
      transactions,
      events,
      freelancers,
      rental_companies: rentalCompanies,
    }

    return new NextResponse(JSON.stringify(backup, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="backup-mov-${companyId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Erro ao gerar backup' }, { status: 500 })
  }
}
