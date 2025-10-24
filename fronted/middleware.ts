import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const protectedRoutes = ['/vuelos', '/reservas', '/perfil', '/destinos', '/mis-vuelos', '/pago']
const publicRoutes = ['/', '/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }
  
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  if (isProtectedRoute) {
    const token = request.cookies.get('auth_token')?.value
    
    if (!token) {
      const loginUrl = new URL('/login', request.url)
      loginUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(loginUrl)
    }
    
    try {
      const parts = token.split('.')
      if (parts.length !== 3) {
        throw new Error('Invalid token')
      }
      
      const payload = JSON.parse(atob(parts[1]))
      
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error('Token expired')
      }
      
      const response = NextResponse.next()
      response.headers.set('x-user-id', payload.sub || '')
      response.headers.set('x-user-email', payload.email || '')
      
      return response
    } catch (error) {
      const response = NextResponse.redirect(new URL('/login', request.url))
      response.cookies.set('auth_token', '', { 
        maxAge: 0,
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      })
      return response
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|webp)$).*)'
  ]
}
