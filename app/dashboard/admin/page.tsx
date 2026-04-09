import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FreelancerManagement from './FreelancerManagement'
import CompanySettings from './CompanySettings'
import RentalCompanies from './RentalCompanies'
import BackupPanel from './BackupPanel'

export default async function AdminPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userData } = await supabase.from('users').select('*, companies(name)').eq('id', user.id).single()
  if (!userData || userData.role !== 'admin') redirect('/dashboard')

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", background: '#0d0f12', minHeight: '100vh', padding: '28px' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '26px', fontWeight: 700, color: '#f0ece4', marginBottom: '4px' }}>Painel ADM</h1>
        <p style={{ color: '#4b5563', fontSize: '13px' }}>Freelancers, fornecedores e configurações da empresa</p>
      </div>

      {/* Freelancers */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Freelancers Pré-cadastrados</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Profissionais disponíveis para escalar nos projetos</p>
        </div>
        <FreelancerManagement />
      </div>

      {/* Empresas de Locação */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Empresas de Locação</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Fornecedores de equipamentos com histórico de gastos mensais</p>
        </div>
        <RentalCompanies />
      </div>

      {/* Configurações da empresa */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Configurações da Empresa</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Personalize as listas de opções usadas em todo o sistema</p>
        </div>
        <CompanySettings />
      </div>

      {/* Backup */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ marginBottom: '16px' }}>
          <h2 style={{ fontFamily: "'Montserrat', sans-serif", fontSize: '16px', fontWeight: 700, color: '#f0ece4', marginBottom: '2px' }}>Backup</h2>
          <p style={{ color: '#4b5563', fontSize: '12px' }}>Exporte todos os dados da empresa em formato portátil</p>
        </div>
        <BackupPanel />
      </div>

    </div>
  )
}
