import { redirect } from 'next/navigation'

// Simple root redirect — no auth() call here to avoid cold-start crashes
// Auth is handled by the (authenticated)/layout.tsx
export default function Home() {
  redirect('/login')
}
