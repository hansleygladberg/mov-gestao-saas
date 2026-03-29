import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas e APIs públicas
  const publicRoutes = [
    '/',
    '/login',
    '/signup',
    '/api/auth/signup',
    '/api/auth/logout',
    '/_next',
    '/favicon.ico',
  ]

  if (publicRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  // Se não está em rota pública, precisa de autenticação
  // Verifica se tem cookie de sessão
  const hasSession = request.cookies.has('sb-rvgrabtlyjdyauuqugcw-auth-token')

  if (!hasSession) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
