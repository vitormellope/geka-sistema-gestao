import { auth } from './auth'
import { NextResponse } from 'next/server'

export async function getSessionOrThrow() {
  const session = await auth()
  if (!session?.user) {
    throw new Error('Unauthorized')
  }
  return session
}

export async function requireRoles(...roles: string[]) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (!roles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })
  }
  return session
}

export function unauthorized() {
  return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
}

export function forbidden() {
  return NextResponse.json({ error: 'Permissão negada' }, { status: 403 })
}
