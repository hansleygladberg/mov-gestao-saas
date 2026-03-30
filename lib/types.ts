export type UserRole = 'admin' | 'editor' | 'viewer'

export interface ModulePermission {
  view: boolean
  create?: boolean
  edit?: boolean
  delete?: boolean
}

export interface UserPermissions {
  projetos: ModulePermission
  clientes: ModulePermission
  financeiro: ModulePermission
  relatorios: ModulePermission
  freelancers: ModulePermission
  adm: ModulePermission
}

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
  name?: string
  company_id: string
  role: UserRole
  permissions?: UserPermissions
  is_active?: boolean
  invited_by?: string
  created_at: string
  updated_at: string
}

export interface Project {
  id: string
  company_id: string
  name: string
  status: 'orcamento' | 'producao' | 'edicao' | 'entregue' | 'pausado'
  value: number
  type?: string
  delivery_date?: string
  description?: string
  progress: number
  data?: Record<string, unknown>
  client_id?: string
  client_name?: string
  created_at: string
  updated_at: string
}

export interface Freelancer {
  id: string
  company_id: string
  name: string
  area?: string
  whatsapp?: string
  email?: string
  daily_rate?: number
  notes?: string
  is_active?: boolean
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
  whatsapp?: string
  created_at: string
  updated_at: string
}

export interface Transaction {
  id: string
  company_id: string
  type: 'entrada' | 'saida' | 'arec' | 'apag'
  value: number
  description?: string
  category?: string
  transaction_date?: string
  project_id?: string
  client_id?: string
  created_at: string
  updated_at: string
}

export interface Event {
  id: string
  company_id: string
  title: string
  event_date: string
  event_type: 'capt' | 'entrega' | 'fixo' | 'manual'
  notes?: string
  created_at: string
  updated_at: string
}
