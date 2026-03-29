import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from './lib/supabase'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas
  const publicRoutes = ['/', '/login', '/signup']
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Verificar autenticação para rotas protegidas
  const supabase = createServerClient()
  const { data: { session } } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
