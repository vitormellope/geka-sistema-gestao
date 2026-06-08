import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Minimal middleware — auth is handled at page/layout level instead
export function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [],
}
