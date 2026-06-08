import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  return NextResponse.json(
    { error: 'Download de arquivos será implementado com Supabase Storage' },
    { status: 501 },
  )
}
