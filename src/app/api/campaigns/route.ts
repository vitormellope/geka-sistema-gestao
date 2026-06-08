import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const where: Record<string, unknown> = {}
  // vendedor/assistente can only see own campaigns
  if (session.user.role === 'vendedor' || session.user.role === 'assistente') {
    where.sellerId = session.user.id
  }

  const campaigns = await prisma.campaign.findMany({
    where,
    include: {
      seller: { select: { name: true } },
      _count: { select: { demands: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(
    campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      client: c.client,
      seller_id: c.sellerId,
      seller_name: c.seller?.name ?? '',
      status: c.status,
      demands_count: c._count.demands,
      created_at: c.createdAt.toISOString(),
      updated_at: c.updatedAt.toISOString(),
    })),
  )
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
  const { name, description, client, seller_id } = body

  if (!name || !client) {
    return NextResponse.json(
      { error: 'Campos obrigatórios: name, client' },
      { status: 400 },
    )
  }

  const campaign = await prisma.campaign.create({
    data: {
      name,
      description: description ?? null,
      client,
      sellerId: seller_id ?? session.user.id,
    },
    include: {
      seller: { select: { name: true } },
      _count: { select: { demands: true } },
    },
  })

  return NextResponse.json(
    {
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
    },
    { status: 201 },
  )
}
