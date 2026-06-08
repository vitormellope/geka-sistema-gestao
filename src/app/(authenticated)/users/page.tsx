'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { User, Role } from '@/types'
import { PageSpinner } from '@/components/Spinner'
import toast from 'react-hot-toast'

const ROLE_LABELS: Record<Role, string> = {
  vendedor: 'Vendedor',
  assistente: 'Assistente',
  orcamentista: 'Orcamentista',
  gerente: 'Gerente',
  projetista: 'Projetista',
}

const ALL_ROLES: Role[] = ['vendedor', 'assistente', 'orcamentista', 'gerente', 'projetista']

interface UserFormData {
  name: string
  email: string
  password: string
  role: Role
}

export default function UserManagementPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [createForm, setCreateForm] = useState<UserFormData>({
    name: '',
    email: '',
    password: '',
    role: 'vendedor',
  })

  // Edit modal state
  const [editUser, setEditUser] = useState<User | null>(null)
  const [editForm, setEditForm] = useState<{ name: string; email: string; role: Role }>({
    name: '',
    email: '',
    role: 'vendedor',
  })

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users')
      if (res.ok) setUsers(await res.json())
    } catch {
      toast.error('Erro ao carregar usuarios')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') {
      if (session?.user?.role !== 'gerente') {
        router.push('/dashboard')
        return
      }
      loadUsers()
    }
  }, [authStatus, session, router, loadUsers])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim() || !createForm.email.trim() || !createForm.password) {
      toast.error('Preencha todos os campos')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createForm),
      })
      if (res.ok) {
        toast.success('Usuario criado com sucesso')
        setShowCreate(false)
        setCreateForm({ name: '', email: '', password: '', role: 'vendedor' })
        await loadUsers()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao criar usuario')
      }
    } catch {
      toast.error('Erro ao criar usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editUser) return

    setSubmitting(true)
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (res.ok) {
        toast.success('Usuario atualizado')
        setEditUser(null)
        await loadUsers()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao atualizar usuario')
      }
    } catch {
      toast.error('Erro ao atualizar usuario')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleActive = async (user: User) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !user.active }),
      })
      if (res.ok) {
        toast.success(user.active ? 'Usuario desativado' : 'Usuario ativado')
        await loadUsers()
      } else {
        toast.error('Erro ao alterar status')
      }
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  const openEdit = (user: User) => {
    setEditUser(user)
    setEditForm({ name: user.name, email: user.email, role: user.role })
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />

  if (session?.user?.role !== 'gerente') return null

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Usuarios</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Novo Usuario
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Perfil</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-500 uppercase">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{u.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                      {ROLE_LABELS[u.role]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2.5 py-1 text-xs font-medium rounded-full ${
                        u.active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {u.active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(u)}
                        className="px-3 py-1.5 text-xs font-medium text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border ${
                          u.active
                            ? 'text-red-600 border-red-200 hover:bg-red-50'
                            : 'text-green-600 border-green-200 hover:bg-green-50'
                        }`}
                      >
                        {u.active ? 'Desativar' : 'Ativar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-sm text-slate-400">
                    Nenhum usuario encontrado
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {users.length} usuario{users.length !== 1 ? 's' : ''}
      </p>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Novo Usuario</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createForm.name}
                  onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={createForm.email}
                  onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Senha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Perfil <span className="text-red-500">*</span>
                </label>
                <select
                  value={createForm.role}
                  onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value as Role }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    setCreateForm({ name: '', email: '', password: '', role: 'vendedor' })
                  }}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Criando...' : 'Criar Usuario'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Editar Usuario</h3>
            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nome</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Perfil</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm((p) => ({ ...p, role: e.target.value as Role }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  {ALL_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
