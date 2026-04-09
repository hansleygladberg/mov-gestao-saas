import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/', '/login', '/signup', '/orcamento', '/cadastro', '/suspended']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Permitir rotas públicas e assets
  if (
    PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + '/')) ||
    pathname.startsWith('/_next') ||
    pathname.includes('.')
  ) {
    return NextResponse.next({ request })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    })

    const { data: { user } } = await supabase.auth.getUser()

    // Não autenticado → login
    if (!user) {
      if (pathname.startsWith('/api/')) return NextResponse.next({ request })
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // Redirecionar login/signup para dashboard se já autenticado
    if (user && (pathname === '/login' || pathname === '/signup')) {
      const url = request.nextUrl.clone()
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Verificar assinatura apenas em rotas do dashboard
    if (pathname.startsWith('/dashboard')) {
      const { data: userData } = await supabase
        .from('users')
        .select('company_id, is_super_admin')
        .eq('id', user.id)
        .single()

      // Super admin tem acesso irrestrito
      if (userData?.is_super_admin) {
        return supabaseResponse
      }

      if (userData?.company_id) {
        // Verificar is_active na empresa
        const { data: company } = await supabase
          .from('companies')
          .select('is_active')
          .eq('id', userData.company_id)
          .single()

        if (company && !company.is_active) {
          const url = request.nextUrl.clone()
          url.pathname = '/suspended'
          return NextResponse.redirect(url)
        }

        // Verificar status da assinatura
        const { data: sub } = await supabase
          .from('subscriptions')
          .select('status')
          .eq('company_id', userData.company_id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (sub && (sub.status === 'suspended' || sub.status === 'cancelled')) {
          const url = request.nextUrl.clone()
          url.pathname = '/suspended'
          return NextResponse.redirect(url)
        }
      }
    }
  } catch {
    // Em caso de erro, deixa passar para não bloquear o usuário
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
