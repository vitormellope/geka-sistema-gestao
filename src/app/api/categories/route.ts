import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      fieldsSchema: true,
    },
  })

  return NextResponse.json(categories)
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
  const { name, fields_schema } = body

  if (!name) {
    return NextResponse.json({ error: 'Campo obrigatório: name' }, { status: 400 })
  }

  const category = await prisma.category.create({
    data: {
      name,
      fieldsSchema: fields_schema ?? [],
    },
    select: {
      id: true,
      name: true,
      fieldsSchema: true,
    },
  })

  return NextResponse.json(category, { status: 201 })
}
