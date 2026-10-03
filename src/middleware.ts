import { NextRequest, NextResponse } from 'next/server'

/**
 * Route protection.
 *
 * The middleware only checks that a session cookie is present — it runs on the
 * Edge runtime, where the database is not reachable. Every protected page and
 * API route independently verifies the session with `requireUser()` /
 * `requireAdmin()`, which is where the real authorisation happens.
 */
const PROTECTED = [
  '/dashboard', '/agents', '/playground', '/automations', '/templates', '/prompts',
  '/executions', '/usage', '/profile', '/settings', '/billing', '/admin',
  '/knowledge', '/team', '/api-keys', '/notifications', '/onboarding', '/audit',
]
const AUTH_PAGES = ['/login', '/register']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const hasSession = Boolean(request.cookies.get('agentflow_session')?.value)

  if (!hasSession && PROTECTED.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  if (hasSession && AUTH_PAGES.includes(pathname)) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Accepting an invitation requires a session, but the link arrives by email
  // and may be opened by someone signed out — send them to log in, then back.
  if (!hasSession && pathname.startsWith('/invitations/')) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', `${pathname}${request.nextUrl.search}`)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  // Skip Next.js internals, static files, and the API (routes guard themselves).
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
