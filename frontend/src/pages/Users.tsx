import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { listUsers, createUser, updateUser } from '@/api/users';
import type { User, UserRoleType } from '@/types';
import { UserRole } from '@/types';
import Spinner from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import {
  Users as UsersIcon,
  Plus,
  Pencil,
  Check,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';

const roleLabels: Record<string, string> = {
  vendedor: 'Vendedor',
  orcamentista: 'Orçamentista',
  projetista: 'Projetista',
  gerente: 'Gerente',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Create form
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRoleType>(UserRole.VENDEDOR);
  const [creating, setCreating] = useState(false);

  // Edit form
  const [editNome, setEditNome] = useState('');
  const [editRole, setEditRole] = useState<UserRoleType>(UserRole.VENDEDOR);
  const [saving, setSaving] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await listUsers();
      setUsers(data);
    } catch {
      showToast('Erro ao carregar usuários', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createUser({ nome, email, password, role });
      showToast('Usuário criado com sucesso!', 'success');
      setNome('');
      setEmail('');
      setPassword('');
      setRole(UserRole.VENDEDOR);
      setShowForm(false);
      fetchUsers();
    } catch {
      showToast('Erro ao criar usuário', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleEdit = (user: User) => {
    setEditingId(user.id);
    setEditNome(user.nome);
    setEditRole(user.role);
  };

  const handleSave = async (id: number) => {
    setSaving(true);
    try {
      await updateUser(id, { nome: editNome, role: editRole });
      showToast('Usuário atualizado!', 'success');
      setEditingId(null);
      fetchUsers();
    } catch {
      showToast('Erro ao atualizar usuário', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: User) => {
    try {
      await updateUser(user.id, { is_active: !user.is_active });
      showToast(
        user.is_active ? 'Usuário desativado' : 'Usuário ativado',
        'success'
      );
      fetchUsers();
    } catch {
      showToast('Erro ao alterar status', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <UsersIcon className="h-7 w-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Usuários</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie os usuários do sistema.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus className="mr-1 h-4 w-4" />
          Novo Usuário
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Criar Usuário
          </h3>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Nome
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Nome completo"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@exemplo.com"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Senha
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-gray-600">
                  Papel
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRoleType)}
                  className="input-field"
                >
                  <option value={UserRole.VENDEDOR}>Vendedor</option>
                  <option value={UserRole.ORCAMENTISTA}>Orçamentista</option>
                  <option value={UserRole.PROJETISTA}>Projetista</option>
                  <option value={UserRole.GERENTE}>Gerente</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={creating}
                className="btn-primary"
              >
                {creating ? <Spinner size="sm" /> : 'Criar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Users table */}
      {users.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <UsersIcon className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Nenhum usuário encontrado
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Nome
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Email
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Papel
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Status
                </th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <input
                        type="text"
                        value={editNome}
                        onChange={(e) => setEditNome(e.target.value)}
                        className="input-field py-1 text-sm"
                      />
                    ) : (
                      <span className="text-sm font-medium text-gray-900">
                        {u.nome}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {u.email}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <select
                        value={editRole}
                        onChange={(e) =>
                          setEditRole(e.target.value as UserRoleType)
                        }
                        className="input-field py-1 text-sm"
                      >
                        <option value={UserRole.VENDEDOR}>Vendedor</option>
                        <option value={UserRole.ORCAMENTISTA}>
                          Orçamentista
                        </option>
                        <option value={UserRole.PROJETISTA}>Projetista</option>
                        <option value={UserRole.GERENTE}>Gerente</option>
                      </select>
                    ) : (
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                        {roleLabels[u.role] || u.role}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        u.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {editingId === u.id ? (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleSave(u.id)}
                          disabled={saving}
                          className="rounded p-1 text-green-600 hover:bg-green-50"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => handleEdit(u)}
                          className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                          title="Editar"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(u)}
                          className={`rounded p-1 ${
                            u.is_active
                              ? 'text-red-400 hover:bg-red-50 hover:text-red-600'
                              : 'text-green-400 hover:bg-green-50 hover:text-green-600'
                          }`}
                          title={u.is_active ? 'Desativar' : 'Ativar'}
                        >
                          {u.is_active ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
