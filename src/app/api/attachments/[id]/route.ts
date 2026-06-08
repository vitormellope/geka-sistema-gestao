import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params
  const attachmentId = Number(id)

  const attachment = await prisma.attachment.findUnique({
    where: { id: attachmentId },
  })

  if (!attachment) {
    return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
  }

  // Only gerente or the uploader can delete
  if (session.user.role !== 'gerente' && attachment.uploadedBy !== session.user.id) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
  }

  await prisma.attachment.delete({ where: { id: attachmentId } })

  return NextResponse.json({ ok: true })
}
