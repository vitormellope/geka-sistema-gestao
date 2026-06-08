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

export default function ProjetistaPanelPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [demands, setDemands] = useState<Demand[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null)
  const [pendingDemandId, setPendingDemandId] = useState<number | null>(null)
  const [pendingObs, setPendingObs] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const loadDemands = useCallback(async () => {
    try {
      const res = await fetch('/api/demands/queue/project')
      if (res.ok) setDemands(await res.json())
    } catch {
      toast.error('Erro ao carregar fila de decupagem')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadDemands()
  }, [authStatus, loadDemands])

  const handleRoute = async (demandId: number, newStatus: string, observation?: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/demands/${demandId}/route-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus, observation: observation || null }),
      })
      if (res.ok) {
        toast.success('Demanda encaminhada')
        setPendingDemandId(null)
        setPendingObs('')
        await loadDemands()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao encaminhar demanda')
      }
    } catch {
      toast.error('Erro ao encaminhar demanda')
    } finally {
      setSubmitting(false)
    }
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Fila de Decupagem / Projeto</h1>
          <p className="text-sm text-slate-500 mt-1">
            {demands.length} demanda{demands.length !== 1 ? 's' : ''} em decupagem
          </p>
        </div>
      </div>

      {demands.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
          <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-slate-500">Nenhuma demanda na fila de decupagem</p>
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

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleRoute(d.id, 'orcamento_direto')}
                    disabled={submitting}
                    className="px-3 py-1.5 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 whitespace-nowrap"
                  >
                    Enviar para Orcamento
                  </button>
                  <button
                    onClick={() => setPendingDemandId(pendingDemandId === d.id ? null : d.id)}
                    disabled={submitting}
                    className="px-3 py-1.5 text-xs font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 whitespace-nowrap"
                  >
                    Pendencia de Informacao
                  </button>
                </div>
              </div>

              {/* Pending Observation */}
              {pendingDemandId === d.id && (
                <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-700 mb-2">Motivo da pendencia</p>
                  <textarea
                    value={pendingObs}
                    onChange={(e) => setPendingObs(e.target.value)}
                    rows={3}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Descreva qual informacao esta faltando..."
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => handleRoute(d.id, 'pendencia_informacao', pendingObs)}
                      disabled={submitting || !pendingObs.trim()}
                      className="px-3 py-1.5 text-sm font-medium bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50"
                    >
                      Confirmar
                    </button>
                    <button
                      onClick={() => {
                        setPendingDemandId(null)
                        setPendingObs('')
                      }}
                      className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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
