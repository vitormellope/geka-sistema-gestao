import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      demandId: true,
      message: true,
      read: true,
      createdAt: true,
    },
  })

  return NextResponse.json(
    notifications.map((n) => ({
      id: n.id,
      demand_id: n.demandId,
      message: n.message,
      read: n.read,
      created_at: n.createdAt.toISOString(),
    })),
  )
}
