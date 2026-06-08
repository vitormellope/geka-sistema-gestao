import { NextResponse } from 'next/server'
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

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const allowedRoles = ['projetista', 'orcamentista', 'gerente']
  if (!allowedRoles.includes(session.user.role)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  const demands = await prisma.demand.findMany({
    where: { status: 'projeto_decupagem' },
    include: {
      seller: { select: { name: true } },
      assistant: { select: { name: true } },
      category: { select: { name: true } },
      attachments: { select: { id: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(demands.map(buildDemandOut))
}
