'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Demand, Status } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { PageSpinner } from '@/components/Spinner'
import { STATUS_LABELS } from '@/lib/transitions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

const ALL_STATUSES: Status[] = [
  'nova',
  'em_triagem',
  'pendencia_informacao',
  'orcamento_direto',
  'projeto_decupagem',
  'orcado',
  'proposta_enviada',
  'fechado',
  'cancelada',
]

export default function DemandListPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const loadDemands = useCallback(async () => {
    try {
      const res = await fetch('/api/demands')
      if (res.ok) setDemands(await res.json())
    } catch {
      toast.error('Erro ao carregar demandas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadDemands()
  }, [authStatus, loadDemands])

  const filtered = useMemo(() => {
    return demands.filter((d) => {
      if (statusFilter && d.status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        if (
          !d.title.toLowerCase().includes(q) &&
          !d.client.toLowerCase().includes(q) &&
          !`#${d.id}`.includes(q)
        )
          return false
      }
      return true
    })
  }, [demands, search, statusFilter])

  if (authStatus === 'loading' || loading) return <PageSpinner />

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Demandas</h1>
        <Link
          href="/demands/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Demanda
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por titulo ou cliente..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todos os Status</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Titulo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Cliente</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Categoria</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Prioridade</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Prazo</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase">Criado em</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((d) => (
                <tr
                  key={d.id}
                  onClick={() => router.push(`/demands/${d.id}`)}
                  className="hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-slate-500 font-mono">#{d.id}</td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{d.title}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.client}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{d.category_name}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} size="sm" />
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={d.priority} size="sm" />
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-600">
                    {d.deadline ? format(new Date(d.deadline), 'dd/MM/yyyy', { locale: ptBR }) : '---'}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-500">
                    {format(new Date(d.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    Nenhuma demanda encontrada
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {filtered.length} demanda{filtered.length !== 1 ? 's' : ''} encontrada{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}
