import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { id } = await params

  const attachments = await prisma.attachment.findMany({
    where: { demandId: Number(id) },
    include: { uploader: { select: { name: true } } },
    orderBy: { uploadedAt: 'desc' },
  })

  return NextResponse.json(
    attachments.map((a) => ({
      id: a.id,
      demand_id: a.demandId,
      filename: a.filename,
      file_type: a.fileType,
      file_size: a.fileSize,
      uploaded_at: a.uploadedAt.toISOString(),
      uploaded_by: a.uploadedBy,
      uploaded_by_name: a.uploader?.name ?? '',
    })),
  )
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

  // Verify demand exists
  const demand = await prisma.demand.findUnique({ where: { id: demandId } })
  if (!demand) {
    return NextResponse.json({ error: 'Demanda não encontrada' }, { status: 404 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 })
  }

  // Placeholder path - will be replaced with Supabase Storage later
  const filePath = `uploads/demands/${demandId}/${Date.now()}_${file.name}`

  const attachment = await prisma.attachment.create({
    data: {
      demandId,
      filename: file.name,
      filePath,
      fileType: file.type || 'application/octet-stream',
      fileSize: file.size,
      uploadedBy: session.user.id,
    },
    include: { uploader: { select: { name: true } } },
  })

  return NextResponse.json(
    {
      id: attachment.id,
      demand_id: attachment.demandId,
      filename: attachment.filename,
      file_type: attachment.fileType,
      file_size: attachment.fileSize,
      uploaded_at: attachment.uploadedAt.toISOString(),
      uploaded_by: attachment.uploadedBy,
      uploaded_by_name: attachment.uploader?.name ?? '',
    },
    { status: 201 },
  )
}
