import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export default async function Home() {
  try {
    const session = await auth()
    if (session) {
      redirect('/dashboard')
    }
  } catch {
    // If auth fails (e.g., no DB), redirect to login
  }
  redirect('/login')
}
