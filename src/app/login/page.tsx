'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast.error('Preencha todos os campos')
      return
    }
    setLoading(true)
    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })
      if (result?.error) {
        toast.error('Email ou senha incorretos')
        setLoading(false)
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      toast.error('Erro ao conectar')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-700 rounded-2xl mb-4 shadow-lg">
            <span className="text-white font-bold text-2xl">G</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Geka</h1>
          <p className="text-slate-500 text-sm mt-1">Sistema de Gestão de Demandas</p>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Entrar</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="label">E-mail</label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Senha</label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="••••••••"
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-2">
              {loading ? (
                <>
                  <span className="spinner w-4 h-4" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          Comunicação Visual Geka &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
