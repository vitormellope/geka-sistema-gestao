import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { notifyUsers } from '@/lib/notifications'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const allowedRoles = ['orcamentista', 'gerente']
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const { id } = await params
  const demandId = Number(id)

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
  })

  if (!demand) {
    return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })
  }

  if (demand.status !== 'orcamento_direto') {
    return NextResponse.json(
      { error: 'Demanda precisa estar no status "orcamento_direto" para ser concluída' },
      { status: 422 },
    )
  }

  const body = await request.json()
  const { estimated_value, observation } = body

  if (estimated_value === undefined || estimated_value === null) {
    return NextResponse.json(
      { error: 'Campo obrigatório: estimated_value' },
      { status: 400 },
    )
  }

  const updated = await prisma.demand.update({
    where: { id: demandId },
    data: {
      status: 'orcado',
      estimatedValue: Number(estimated_value),
    },
    include: {
      seller: { select: { name: true } },
      assistant: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  // Create history log
  await prisma.historyLog.create({
    data: {
      demandId,
      userId: session.user.id,
      prevStatus: 'orcamento_direto',
      newStatus: 'orcado',
      observation: observation ?? null,
    },
  })

  // Notify seller + assistant
  const notifyIds = [demand.sellerId, ...(demand.assistantId ? [demand.assistantId] : [])]
  await notifyUsers(
    demandId,
    `Demanda "${demand.title}" foi orçada em R$ ${Number(estimated_value).toFixed(2)}`,
    notifyIds,
  )

  return NextResponse.json({
    id: updated.id,
    title: updated.title,
    status: updated.status,
    estimated_value: updated.estimatedValue,
    seller_name: updated.seller?.name ?? '',
    category_name: updated.category?.name ?? '',
  })
}
