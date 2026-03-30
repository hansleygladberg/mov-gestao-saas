import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import UserManagement from './UserManagement'
import FreelancerManagement from './FreelancerManagement'
import CompanySettings from './CompanySettings'
import RentalCompanies from './RentalCompanies'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*, companies(name)').eq('id', user.id).single()
  if (!userData || userData.role !== 'admin') redirect('/dashboard')

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .eq('company_id', userData.company_id)
    .order('created_at', { ascending: true })

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Painel ADM</h1>
        <p style={{ color: '#4b5563', fontSize: '13px' }}>Gerenciar usuários, freelancers e configurações da empresa</p>
      </div>

      {/* Usuários */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Usuários</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Membros da equipe com acesso ao sistema</p>
        </div>
        <UserManagement initialUsers={users || []} companyId={userData.company_id} currentUserId={user.id} />
      </div>

      {/* Freelancers */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Freelancers Pré-cadastrados</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Profissionais disponíveis para escalar nos projetos</p>
        </div>
        <FreelancerManagement />
      </div>

      {/* Empresas de Locação */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Empresas de Locação</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Fornecedores de equipamentos com histórico de gastos mensais</p>
        </div>
        <RentalCompanies />
      </div>

      {/* Configurações da empresa */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Configurações da Empresa</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Personalize as listas de opções usadas em todo o sistema</p>
        </div>
        <CompanySettings />
      </div>

    </div>
  )
}
