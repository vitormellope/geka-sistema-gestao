import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const users = await prisma.user.findMany({
    where: {
      role: { in: ['vendedor', 'assistente'] },
      active: true,
    },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  })

  return NextResponse.json(users)
}
