import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const notificationId = Number(id)

  const notification = await prisma.notification.findUnique({
    where: { id: notificationId },
  })

  if (!notification) {
    return NextResponse.json({ error: 'Notificação não encontrada' }, { status: 404 })
  }

  if (notification.userId !== session.user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  await prisma.notification.update({
    where: { id: notificationId },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
