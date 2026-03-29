import { createServerClient } from './supabase'
import { User } from './types'

export async function getCurrentUser(): Promise<User | null> {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: userData } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return userData || null
}

export async function getCurrentCompany() {
  const user = await getCurrentUser()
  if (!user) return null

  const supabase = createServerClient()
  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', user.company_id)
    .single()

  return company
}

export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser()
  return !!user
}

export async function hasRole(requiredRole: 'admin' | 'editor' | 'viewer'): Promise<boolean> {
  const user = await getCurrentUser()
  if (!user) return false

  const roles = ['viewer', 'editor', 'admin']
  const userRoleIndex = roles.indexOf(user.role)
  const requiredRoleIndex = roles.indexOf(requiredRole)

  return userRoleIndex >= requiredRoleIndex
}
