import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  await prisma.notification.updateMany({
    where: {
      userId: session.user.id,
      read: false,
    },
    data: { read: true },
  })

  return NextResponse.json({ ok: true })
}
