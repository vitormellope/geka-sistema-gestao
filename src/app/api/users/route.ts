import { NextRequest, NextResponse } from 'next/server'
import bcryptjs from 'bcryptjs'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (session.user.role !== 'gerente') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const users = await prisma.user.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (session.user.role !== 'gerente') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json()
  const { name, email, password, role, active } = body

  if (!name || !email || !password || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios: name, email, password, role' }, { status: 400 })
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
  }

  const passwordHash = await bcryptjs.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      active: active ?? true,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  })

  return NextResponse.json(user, { status: 201 })
}
