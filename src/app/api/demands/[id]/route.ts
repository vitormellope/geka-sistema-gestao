import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcPriority } from '@/lib/priority'

function buildDemandDetail(demand: any) {
  const fieldValues: Record<string, string> = {}
  for (const fv of demand.fieldValues ?? []) {
    fieldValues[fv.fieldName] = fv.fieldValue ?? ''
  }

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
    field_values: fieldValues,
    history: (demand.historyLogs ?? []).map((h: any) => ({
      id: h.id,
      timestamp: h.timestamp.toISOString(),
      user_id: h.userId,
      user_name: h.user?.name ?? '',
      prev_status: h.prevStatus,
      new_status: h.newStatus,
      observation: h.observation,
    })),
    attachments: (demand.attachments ?? []).map((a: any) => ({
      id: a.id,
      demand_id: a.demandId,
      filename: a.filename,
      file_type: a.fileType,
      file_size: a.fileSize,
      uploaded_at: a.uploadedAt.toISOString(),
      uploaded_by: a.uploadedBy,
      uploaded_by_name: a.uploader?.name ?? '',
    })),
  }
}

const detailIncludes = {
  seller: { select: { name: true } },
  assistant: { select: { name: true } },
  category: { select: { name: true } },
  fieldValues: true,
  historyLogs: {
    include: { user: { select: { name: true } } },
    orderBy: { timestamp: 'desc' as const },
  },
  attachments: {
    include: { uploader: { select: { name: true } } },
    orderBy: { uploadedAt: 'desc' as const },
  },
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const demand = await prisma.demand.findUnique({
    where: { id: Number(id) },
    include: detailIncludes,
  })

  if (!demand) {
    return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })
  }

  // Access control
  const { role, id: userId } = session.user
  if (role === 'vendedor') {
    if (demand.sellerId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
  } else if (role === 'assistente') {
    if (demand.sellerId !== userId && demand.assistantId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
  }
  // orcamentista, gerente, projetista can see all

  return NextResponse.json(buildDemandDetail(demand))
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const demandId = Number(id)

  const demand = await prisma.demand.findUnique({
    where: { id: demandId },
  })

  if (!demand) {
    return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })
  }

  // Access control: owner can edit in editable statuses, orcamentista/gerente can always edit
  const { role, id: userId } = session.user
  const editableStatuses = ['nova', 'pendencia_informacao']
  const isOwner = demand.sellerId === userId || demand.assistantId === userId
  const isManager = role === 'orcamentista' || role === 'gerente'

  if (!isManager && !(isOwner && editableStatuses.includes(demand.status))) {
    return NextResponse.json({ error: 'Acesso negado para edição' }, { status: 403 })
  }

  const body = await request.json()
  const data: Record<string, unknown> = {}

  if (body.title !== undefined) data.title = body.title
  if (body.client !== undefined) data.client = body.client
  if (body.category_id !== undefined) data.categoryId = body.category_id
  if (body.assistant_id !== undefined) data.assistantId = body.assistant_id
  if (body.campaign_id !== undefined) data.campaignId = body.campaign_id
  if (body.deadline !== undefined) {
    data.deadline = body.deadline ? new Date(body.deadline) : null
  }

  // Recalculate priority
  const deadlineForPriority = data.deadline !== undefined
    ? (data.deadline as Date | null)
    : demand.deadline
  data.priority = body.priority || calcPriority(deadlineForPriority)

  const updated = await prisma.demand.update({
    where: { id: demandId },
    data,
    include: detailIncludes,
  })

  // If field_values provided, replace all
  if (body.field_values && typeof body.field_values === 'object') {
    await prisma.demandFieldValue.deleteMany({ where: { demandId } })
    const entries = Object.entries(body.field_values as Record<string, string>)
    if (entries.length > 0) {
      await prisma.demandFieldValue.createMany({
        data: entries.map(([fieldName, fieldValue]) => ({
          demandId,
          fieldName,
          fieldValue: String(fieldValue),
        })),
      })
    }

    // Re-fetch to include updated field values
    const refreshed = await prisma.demand.findUnique({
      where: { id: demandId },
      include: detailIncludes,
    })
    return NextResponse.json(buildDemandDetail(refreshed))
  }

  return NextResponse.json(buildDemandDetail(updated))
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

  await prisma.demand.delete({ where: { id: Number(id) } })

  return NextResponse.json({ ok: true })
}
