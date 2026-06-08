// Validate required environment variables
// Note: DATABASE_URL is optional for build time, but required at runtime for API calls

export const env = {
  databaseUrl: process.env.DATABASE_URL,
  directUrl: process.env.DIRECT_URL,
  nextauthUrl: process.env.NEXTAUTH_URL || 'http://localhost:3000',
  nextauthSecret: process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET || 'development-secret-key',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
}

// Validate critical vars at runtime (when API is actually called)
export function validateRuntimeEnv() {
  const missing: string[] = []

  if (!env.databaseUrl) missing.push('DATABASE_URL')
  if (!env.nextauthSecret || env.nextauthSecret === 'development-secret-key') {
    console.warn('NEXTAUTH_SECRET not configured — using development key')
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Configure these in your Vercel project settings or .env file.'
    )
  }
}
