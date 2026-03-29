export type UserRole = 'admin' | 'editor' | 'viewer'

export interface Company {
  id: string
  name: string
  domain?: string
  created_at: string
  updated_at: string
}

export interface User {
  id: string
  email: string
  company_id: string
  role: UserRole
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  company_id: string
  name: string
  client_id: string
  status: 'orcamento' | 'orcamento_desaprovado' | 'producao' | 'edicao' | 'entregue' | 'pausado'
  value: number
  type?: string
  delivery_date?: string
  description?: string
  data?: Record<string, any>
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  company_id: string
  name: string
  segment?: string
  monthly_value?: number
  phone?: string
  email?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  company_id: string
  type: 'entrada' | 'saida' | 'arec' | 'apag'
  value: number
  description: string
  category?: string
  date?: string
  project_id?: string
  client_id?: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  company_id: string
  title: string
  date: string
  type: 'capt' | 'entrega' | 'fixo' | 'manual'
  notes?: string
  created_at: string
  updated_at: string
}
