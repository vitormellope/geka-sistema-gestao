import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params

  const campaign = await prisma.campaign.findUnique({
    where: { id: Number(id) },
    include: {
      seller: { select: { name: true } },
      demands: {
        include: {
          seller: { select: { name: true } },
          assistant: { select: { name: true } },
          category: { select: { name: true } },
          attachments: { select: { id: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!campaign) {
    return NextResponse.json({ error: 'Campanha não encontrada' }, { status: 404 })
  }

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    client: campaign.client,
    seller_id: campaign.sellerId,
    seller_name: campaign.seller?.name ?? '',
    status: campaign.status,
    created_at: campaign.createdAt.toISOString(),
    updated_at: campaign.updatedAt.toISOString(),
    demands: campaign.demands.map(buildDemandOut),
  })
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
  const body = await request.json()

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.description !== undefined) data.description = body.description
  if (body.client !== undefined) data.client = body.client
  if (body.status !== undefined) data.status = body.status

  const campaign = await prisma.campaign.update({
    where: { id: Number(id) },
    data,
    include: {
      seller: { select: { name: true } },
      _count: { select: { demands: true } },
    },
  })

  return NextResponse.json({
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    client: campaign.client,
    seller_id: campaign.sellerId,
    seller_name: campaign.seller?.name ?? '',
    status: campaign.status,
    demands_count: campaign._count.demands,
    created_at: campaign.createdAt.toISOString(),
    updated_at: campaign.updatedAt.toISOString(),
  })
}
