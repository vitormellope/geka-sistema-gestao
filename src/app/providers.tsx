'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'react-hot-toast'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#0f172a',
            color: '#f8fafc',
            fontSize: '14px',
            borderRadius: '10px',
          },
          success: {
            iconTheme: { primary: '#22c55e', secondary: '#f8fafc' },
          },
          error: {
            iconTheme: { primary: '#ef4444', secondary: '#f8fafc' },
          },
        }}
      />
    </SessionProvider>
  )
}
