import type { NextAuthConfig } from 'next-auth'

export const authConfig = {
  session: {
    strategy: 'jwt' as const,
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = Number(user.id)
        token.role = (user as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as { id: number; role: string }
        u.id = token.id as number
        u.role = token.role as string
      }
      return session
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user
      const isOnLogin = nextUrl.pathname === '/login'
      if (isOnLogin) return true
      return isLoggedIn
    },
  },
  providers: [],
} satisfies NextAuthConfig
