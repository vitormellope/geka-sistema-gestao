import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { calcPriority } from '@/lib/priority'
import { canTransition, requiresObservation } from '@/lib/transitions'
import { notifyUsers, getOrcamentistaIds } from '@/lib/notifications'

function buildDemandOut(demand: any) {
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
  }
}

export async function POST(
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

  const body = await request.json()
  const { new_status, observation, sla_date } = body

  if (!new_status) {
    return NextResponse.json({ error: 'Campo obrigatório: new_status' }, { status: 400 })
  }

  const { role, id: userId } = session.user

  // Check transition validity
  if (!canTransition(demand.status, new_status, role)) {
    return NextResponse.json(
      { error: `Transição de "${demand.status}" para "${new_status}" não permitida para o papel "${role}"` },
      { status: 403 },
    )
  }

  // Check if observation is required
  if (requiresObservation(demand.status, new_status) && !observation) {
    return NextResponse.json(
      { error: 'Observação obrigatória para esta transição' },
      { status: 422 },
    )
  }

  // For vendedor/assistente routing from pendencia_informacao to nova, verify ownership
  if (
    demand.status === 'pendencia_informacao' &&
    new_status === 'nova' &&
    (role === 'vendedor' || role === 'assistente')
  ) {
    if (demand.sellerId !== userId && demand.assistantId !== userId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
  }

  // Update demand status
  const updateData: Record<string, unknown> = {
    status: new_status,
    priority: calcPriority(demand.deadline),
  }
  if (sla_date) {
    updateData.slaDate = new Date(sla_date)
  }

  const updated = await prisma.demand.update({
    where: { id: demandId },
    data: updateData,
    include: {
      seller: { select: { name: true } },
      assistant: { select: { name: true } },
      category: { select: { name: true } },
      fieldValues: true,
      historyLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
      },
      attachments: { select: { id: true } },
    },
  })

  // Create history log
  await prisma.historyLog.create({
    data: {
      demandId,
      userId,
      prevStatus: demand.status,
      newStatus: new_status,
      observation: observation ?? null,
    },
  })

  // Generate notifications based on new_status
  const notifyIds: number[] = []
  const sellerAssistantIds = [demand.sellerId, ...(demand.assistantId ? [demand.assistantId] : [])]

  switch (new_status) {
    case 'pendencia_informacao':
      await notifyUsers(demandId, `Demanda "${demand.title}" requer informações adicionais`, sellerAssistantIds)
      break
    case 'nova':
      // Returned from pendencia_informacao
      {
        const orcIds = await getOrcamentistaIds()
        await notifyUsers(demandId, `Demanda "${demand.title}" foi atualizada e retornou para triagem`, orcIds)
      }
      break
    case 'em_triagem':
      {
        const orcIds = await getOrcamentistaIds()
        await notifyUsers(demandId, `Demanda "${demand.title}" está em triagem`, orcIds)
      }
      break
    case 'orcamento_direto':
      {
        const orcIds = await getOrcamentistaIds()
        await notifyUsers(demandId, `Demanda "${demand.title}" encaminhada para orçamento direto`, orcIds)
      }
      break
    case 'projeto_decupagem':
      {
        const orcIds = await getOrcamentistaIds()
        await notifyUsers(
          demandId,
          `Demanda "${demand.title}" encaminhada para projeto/decupagem`,
          [...orcIds, ...sellerAssistantIds],
        )
      }
      break
    case 'orcado':
      await notifyUsers(demandId, `Demanda "${demand.title}" foi orçada`, sellerAssistantIds)
      break
    case 'cancelada':
      await notifyUsers(demandId, `Demanda "${demand.title}" foi cancelada`, sellerAssistantIds)
      break
  }

  // Re-fetch with history to include the new log
  const refreshed = await prisma.demand.findUnique({
    where: { id: demandId },
    include: {
      seller: { select: { name: true } },
      assistant: { select: { name: true } },
      category: { select: { name: true } },
      fieldValues: true,
      historyLogs: {
        include: { user: { select: { name: true } } },
        orderBy: { timestamp: 'desc' },
      },
      attachments: { select: { id: true } },
    },
  })

  return NextResponse.json(buildDemandOut(refreshed))
}
