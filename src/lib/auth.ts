import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcryptjs from 'bcryptjs'
import { prisma } from './prisma'
import { authConfig } from './auth.config'

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        })

        if (!user || !user.active) return null

        const isValid = await bcryptjs.compare(
          credentials.password as string,
          user.passwordHash,
        )
        if (!isValid) return null

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
})
