import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcPriority } from '@/lib/priority'
import { notifyUsers, getOrcamentistaIds } from '@/lib/notifications'

function buildDemandOut(demand: any) {
  return {
    id: demand.id,
    title: demand.title,
    seller_id: demand.sellerId,
    seller_name: demand.seller?.name ?? '',
    assistant_id: demand.assistantId,
    assistant_name: demand.assistant?.name ?? null,
    client: demand.client,
    category_id: demand.categoryId,
    category_name: demand.category?.name ?? '',
    deadline: demand.deadline?.toISOString() ?? null,
    sla_date: demand.slaDate?.toISOString() ?? null,
    campaign_id: demand.campaignId,
    status: demand.status,
    priority: demand.priority,
    estimated_value: demand.estimatedValue,
    created_at: demand.createdAt.toISOString(),
    updated_at: demand.updatedAt.toISOString(),
    attachments_count: demand.attachments?.length ?? 0,
  }
}

const demandIncludes = {
  seller: { select: { name: true } },
  assistant: { select: { name: true } },
  category: { select: { name: true } },
  attachments: { select: { id: true } },
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const status = searchParams.get('status')

  const where: Record<string, unknown> = {}
  if (status) {
    where.status = status
  }

  const demands = await prisma.demand.findMany({
    where,
    include: demandIncludes,
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(demands.map(buildDemandOut))
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const allowedRoles = ['vendedor', 'assistente', 'gerente']
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const body = await request.json()
  const {
    title,
    client,
    category_id,
    deadline,
    assistant_id,
    priority,
    field_values,
    campaign_id,
  } = body

  if (!title || !client || !category_id) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: title, client, category_id' },
      { status: 400 },
    )
  }

  const deadlineDate = deadline ? new Date(deadline) : null
  const calculatedPriority = priority || calcPriority(deadlineDate)

  const demand = await prisma.demand.create({
    data: {
      title,
      client,
      categoryId: category_id,
      sellerId: session.user.id,
      assistantId: assistant_id ?? null,
      campaignId: campaign_id ?? null,
      deadline: deadlineDate,
      status: 'nova',
      priority: calculatedPriority,
    },
    include: demandIncludes,
  })

  // Create field values
  if (field_values && typeof field_values === 'object') {
    const entries = Object.entries(field_values as Record<string, string>)
    if (entries.length > 0) {
      await prisma.demandFieldValue.createMany({
        data: entries.map(([fieldName, fieldValue]) => ({
          demandId: demand.id,
          fieldName,
          fieldValue: String(fieldValue),
        })),
      })
    }
  }

  // Create initial history log
  await prisma.historyLog.create({
    data: {
      demandId: demand.id,
      userId: session.user.id,
      prevStatus: null,
      newStatus: 'nova',
    },
  })

  // Notify orcamentistas and gerentes
  const orcamentistaIds = await getOrcamentistaIds()
  if (orcamentistaIds.length > 0) {
    await notifyUsers(
      demand.id,
      `Nova demanda criada: "${title}"`,
      orcamentistaIds,
    )
  }

  return NextResponse.json(buildDemandOut(demand), { status: 201 })
}
