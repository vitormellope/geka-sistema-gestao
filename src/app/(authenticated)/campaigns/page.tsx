'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Campaign, Demand } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { PageSpinner } from '@/components/Spinner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function CampaignListPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [expandedDemands, setExpandedDemands] = useState<Demand[]>([])
  const [loadingDemands, setLoadingDemands] = useState(false)

  // Create modal state
  const [showCreate, setShowCreate] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createClient, setCreateClient] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadCampaigns = useCallback(async () => {
    try {
      const res = await fetch('/api/campaigns')
      if (res.ok) setCampaigns(await res.json())
    } catch {
      toast.error('Erro ao carregar campanhas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadCampaigns()
  }, [authStatus, loadCampaigns])

  const handleExpand = async (campaignId: number) => {
    if (expandedId === campaignId) {
      setExpandedId(null)
      setExpandedDemands([])
      return
    }

    setExpandedId(campaignId)
    setLoadingDemands(true)
    try {
      const res = await fetch(`/api/campaigns/${campaignId}/demands`)
      if (res.ok) {
        setExpandedDemands(await res.json())
      }
    } catch {
      toast.error('Erro ao carregar demandas da campanha')
    } finally {
      setLoadingDemands(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName.trim() || !createClient.trim()) {
      toast.error('Preencha nome e cliente')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          client: createClient.trim(),
          description: createDescription.trim() || null,
        }),
      })
      if (res.ok) {
        toast.success('Campanha criada com sucesso')
        setShowCreate(false)
        setCreateName('')
        setCreateClient('')
        setCreateDescription('')
        await loadCampaigns()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao criar campanha')
      }
    } catch {
      toast.error('Erro ao criar campanha')
    } finally {
      setSubmitting(false)
    }
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />

  const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-800',
    closed: 'bg-slate-100 text-slate-600',
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Campanhas</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Campanha
        </button>
      </div>

      {campaigns.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <p className="text-slate-500">Nenhuma campanha encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((c) => (
            <div key={c.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div
                className="p-5 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => handleExpand(c.id)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold text-slate-900">{c.name}</h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                          statusColors[c.status] || 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {c.status === 'active' ? 'Ativa' : 'Encerrada'}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      {c.client} &middot; Vendedor: {c.seller_name}
                    </p>
                    {c.description && (
                      <p className="text-xs text-slate-400 mt-1">{c.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-900">{c.demands_count}</p>
                      <p className="text-xs text-slate-400">demandas</p>
                    </div>
                    <svg
                      className={`w-5 h-5 text-slate-400 transition-transform ${
                        expandedId === c.id ? 'rotate-180' : ''
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                  <span>Criada em {format(new Date(c.created_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                  <span>Atualizada em {format(new Date(c.updated_at), 'dd/MM/yyyy', { locale: ptBR })}</span>
                </div>
              </div>

              {/* Expanded Demands */}
              {expandedId === c.id && (
                <div className="border-t border-slate-200 bg-slate-50 p-4">
                  {loadingDemands ? (
                    <p className="text-sm text-slate-400 text-center py-4">Carregando demandas...</p>
                  ) : expandedDemands.length === 0 ? (
                    <p className="text-sm text-slate-400 text-center py-4">Nenhuma demanda nesta campanha</p>
                  ) : (
                    <div className="space-y-2">
                      {expandedDemands.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => router.push(`/demands/${d.id}`)}
                          className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200 cursor-pointer hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-xs text-slate-400 font-mono">#{d.id}</span>
                            <span className="text-sm font-medium text-slate-900 truncate">{d.title}</span>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <StatusBadge status={d.status} size="sm" />
                            <PriorityBadge priority={d.priority} size="sm" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Nova Campanha</h3>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome da campanha"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Cliente <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createClient}
                  onChange={(e) => setCreateClient(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nome do cliente"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Descricao</label>
                <textarea
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descricao da campanha (opcional)"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreate(false)
                    setCreateName('')
                    setCreateClient('')
                    setCreateDescription('')
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
                  {submitting ? 'Criando...' : 'Criar Campanha'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
