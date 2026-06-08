import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params

  const category = await prisma.category.findUnique({
    where: { id: Number(id) },
    select: {
      id: true,
      name: true,
      fieldsSchema: true,
    },
  })

  if (!category) {
    return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 })
  }

  return NextResponse.json(category)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (session.user.role !== 'gerente') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.name !== undefined) data.name = body.name
  if (body.fields_schema !== undefined) data.fieldsSchema = body.fields_schema

  const category = await prisma.category.update({
    where: { id: Number(id) },
    data,
    select: {
      id: true,
      name: true,
      fieldsSchema: true,
    },
  })

  return NextResponse.json(category)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }
  if (session.user.role !== 'gerente') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  const categoryId = Number(id)

  const demandCount = await prisma.demand.count({
    where: { categoryId },
  })

  if (demandCount > 0) {
    return NextResponse.json(
      { error: 'Categoria possui demandas vinculadas e não pode ser removida' },
      { status: 409 },
    )
  }

  await prisma.category.delete({ where: { id: categoryId } })

  return NextResponse.json({ ok: true })
}
