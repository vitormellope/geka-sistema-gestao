import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the pathname from the request
  const pathname = request.nextUrl.pathname

  // Allow public routes
  const publicRoutes = ['/login', '/api/auth']
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublicRoute) {
    return NextResponse.next()
  }

  // For protected routes, check if user has session cookie
  // NextAuth sets cookies that we can check
  const hasSession = request.cookies.has('next-auth.session-token') ||
                     request.cookies.has('__Secure-next-auth.session-token')

  if (!hasSession && pathname !== '/login') {
    const loginUrl = new URL('/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico|icons.svg|.*\\.svg).*)',
  ],
}
