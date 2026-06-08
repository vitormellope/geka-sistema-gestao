import { prisma } from './prisma'

export async function notifyUsers(demandId: number, message: string, userIds: number[]) {
  const uniqueIds = [...new Set(userIds)]
  await prisma.notification.createMany({
    data: uniqueIds.map(userId => ({
      userId,
      demandId,
      message,
    })),
  })
}

export async function getOrcamentistaIds(): Promise<number[]> {
  const users = await prisma.user.findMany({
    where: {
      role: { in: ['orcamentista', 'gerente'] },
      active: true,
    },
    select: { id: true },
  })
  return users.map(u => u.id)
}
