'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Demand } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { PageSpinner } from '@/components/Spinner'
import { DemandSlideOver } from '@/components/DemandSlideOver'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function DirectQuotePanelPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null)

  // Conclude modal state
  const [concludeDemandId, setConcludeDemandId] = useState<number | null>(null)
  const [estimatedValue, setEstimatedValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadDemands = useCallback(async () => {
    try {
      const res = await fetch('/api/demands/queue/direct')
      if (res.ok) setDemands(await res.json())
    } catch {
      toast.error('Erro ao carregar fila de orcamento direto')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadDemands()
  }, [authStatus, loadDemands])

  const handleConclude = async () => {
    if (!concludeDemandId) return
    if (!estimatedValue || Number(estimatedValue) <= 0) {
      toast.error('Informe um valor valido')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/demands/${concludeDemandId}/conclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimated_value: parseFloat(estimatedValue) }),
      })
      if (res.ok) {
        toast.success('Orcamento concluido com sucesso')
        setConcludeDemandId(null)
        setEstimatedValue('')
        await loadDemands()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao concluir orcamento')
      }
    } catch {
      toast.error('Erro ao concluir orcamento')
    } finally {
      setSubmitting(false)
    }
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orcamento Direto</h1>
          <p className="text-sm text-slate-500 mt-1">
            {demands.length} demanda{demands.length !== 1 ? 's' : ''} aguardando orcamento
          </p>
        </div>
      </div>

      {demands.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500">Nenhuma demanda aguardando orcamento direto</p>
        </div>
      ) : (
        <div className="space-y-3">
          {demands.map((d) => (
            <div
              key={d.id}
              className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className="flex-1 min-w-0 cursor-pointer"
                  onClick={() => setSelectedDemandId(d.id)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-slate-400 font-mono">#{d.id}</span>
                    <StatusBadge status={d.status} size="sm" />
                    <PriorityBadge priority={d.priority} size="sm" />
                  </div>
                  <h3 className="text-sm font-semibold text-slate-900 mb-1">{d.title}</h3>
                  <p className="text-sm text-slate-500">
                    {d.client} &middot; {d.category_name}
                  </p>
                  <div className="flex items-center gap-4 mt-1">
                    <p className="text-xs text-slate-400">
                      Vendedor: {d.seller_name}
                    </p>
                    {d.deadline && (
                      <p className="text-xs text-slate-400">
                        Prazo: {format(new Date(d.deadline), 'dd/MM/yyyy', { locale: ptBR })}
                      </p>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => {
                    setConcludeDemandId(d.id)
                    setEstimatedValue('')
                  }}
                  disabled={submitting}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 whitespace-nowrap flex-shrink-0"
                >
                  Concluir Orcamento
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Conclude Modal */}
      {concludeDemandId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Concluir Orcamento</h3>
            <p className="text-sm text-slate-500 mb-4">
              Demanda #{concludeDemandId} - Informe o valor estimado.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor Estimado (R$)</label>
              <input
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                step="0.01"
                min="0"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="0,00"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setConcludeDemandId(null)
                  setEstimatedValue('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConclude}
                disabled={submitting || !estimatedValue}
                className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedDemandId && (
        <DemandSlideOver
          demandId={selectedDemandId}
          onClose={() => setSelectedDemandId(null)}
          onStatusChange={loadDemands}
        />
      )}
    </div>
  )
}
