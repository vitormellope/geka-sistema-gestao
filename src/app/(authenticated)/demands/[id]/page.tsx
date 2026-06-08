'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter, useParams } from 'next/navigation'
import type { Demand } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { PageSpinner } from '@/components/Spinner'
import { getAvailableTransitions, requiresObservation, STATUS_LABELS } from '@/lib/transitions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'

export default function DemandDetailPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const params = useParams()
  const demandId = params.id as string

  const [demand, setDemand] = useState<Demand | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Transition modal state
  const [transitionTarget, setTransitionTarget] = useState<string | null>(null)
  const [observation, setObservation] = useState('')

  // Conclude modal state
  const [showConclude, setShowConclude] = useState(false)
  const [concludeValue, setConcludeValue] = useState('')

  // Upload state
  const [uploading, setUploading] = useState(false)

  const loadDemand = useCallback(async () => {
    try {
      const res = await fetch(`/api/demands/${demandId}`)
      if (res.ok) {
        setDemand(await res.json())
      } else {
        toast.error('Demanda nao encontrada')
        router.push('/demands')
      }
    } catch {
      toast.error('Erro ao carregar demanda')
    } finally {
      setLoading(false)
    }
  }, [demandId, router])

  useEffect(() => {
    if (authStatus === 'authenticated') loadDemand()
  }, [authStatus, loadDemand])

  const role = session?.user?.role || ''
  const transitions = demand ? getAvailableTransitions(demand.status, role) : []

  const handleTransition = (newStatus: string) => {
    if (requiresObservation(demand!.status, newStatus)) {
      setTransitionTarget(newStatus)
      return
    }
    if (newStatus === 'orcado' && demand?.status === 'orcamento_direto') {
      setShowConclude(true)
      return
    }
    doTransition(newStatus)
  }

  const doTransition = async (newStatus: string, obs?: string) => {
    setSubmitting(true)
    try {
      const res = await fetch(`/api/demands/${demandId}/route-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: newStatus, observation: obs || null }),
      })
      if (res.ok) {
        toast.success('Status atualizado')
        setTransitionTarget(null)
        setObservation('')
        await loadDemand()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao atualizar status')
      }
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setSubmitting(false)
    }
  }

  const handleConclude = async () => {
    if (!concludeValue || Number(concludeValue) <= 0) {
      toast.error('Informe um valor valido')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/demands/${demandId}/conclude`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estimated_value: parseFloat(concludeValue) }),
      })
      if (res.ok) {
        toast.success('Orcamento concluido')
        setShowConclude(false)
        setConcludeValue('')
        await loadDemand()
      } else {
        toast.error('Erro ao concluir orcamento')
      }
    } catch {
      toast.error('Erro ao concluir orcamento')
    } finally {
      setSubmitting(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    setUploading(true)
    try {
      const formData = new FormData()
      for (let i = 0; i < files.length; i++) {
        formData.append('files', files[i])
      }

      const res = await fetch(`/api/demands/${demandId}/attachments`, {
        method: 'POST',
        body: formData,
      })
      if (res.ok) {
        toast.success('Arquivo(s) enviado(s)')
        await loadDemand()
      } else {
        toast.error('Erro ao enviar arquivo')
      }
    } catch {
      toast.error('Erro ao enviar arquivo')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />
  if (!demand) return null

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button + Header */}
      <div className="flex items-start gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="mt-1 p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-900">
              <span className="text-slate-400">#{demand.id}</span> {demand.title}
            </h1>
            <StatusBadge status={demand.status} />
            <PriorityBadge priority={demand.priority} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Cards */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">Informacoes</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-slate-500">Cliente</p>
                <p className="font-medium text-slate-900">{demand.client}</p>
              </div>
              <div>
                <p className="text-slate-500">Categoria</p>
                <p className="font-medium text-slate-900">{demand.category_name}</p>
              </div>
              <div>
                <p className="text-slate-500">Vendedor</p>
                <p className="font-medium text-slate-900">{demand.seller_name}</p>
              </div>
              <div>
                <p className="text-slate-500">Assistente</p>
                <p className="font-medium text-slate-900">{demand.assistant_name || '---'}</p>
              </div>
              <div>
                <p className="text-slate-500">Prazo</p>
                <p className="font-medium text-slate-900">
                  {demand.deadline
                    ? format(new Date(demand.deadline), 'dd/MM/yyyy', { locale: ptBR })
                    : '---'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">SLA</p>
                <p className="font-medium text-slate-900">
                  {demand.sla_date
                    ? format(new Date(demand.sla_date), 'dd/MM/yyyy', { locale: ptBR })
                    : '---'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Valor Estimado</p>
                <p className="font-medium text-slate-900">
                  {demand.estimated_value
                    ? `R$ ${demand.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                    : '---'}
                </p>
              </div>
              <div>
                <p className="text-slate-500">Criado em</p>
                <p className="font-medium text-slate-900">
                  {format(new Date(demand.created_at), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                </p>
              </div>
            </div>
          </div>

          {/* Dynamic Fields */}
          {demand.field_values && Object.keys(demand.field_values).length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Campos Adicionais</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {Object.entries(demand.field_values).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-slate-500">{key}</p>
                    <p className="font-medium text-slate-900">{String(value) || '---'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* History Timeline */}
          {demand.history && demand.history.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-4">Historico</h2>
              <div className="space-y-4">
                {demand.history.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div className="w-3 h-3 bg-blue-500 rounded-full flex-shrink-0" />
                      <div className="w-px flex-1 bg-slate-200 mt-1" />
                    </div>
                    <div className="pb-4">
                      <p className="text-sm text-slate-900">
                        <span className="font-medium">{h.user_name}</span>{' '}
                        {h.prev_status
                          ? `alterou de ${STATUS_LABELS[h.prev_status] || h.prev_status} para ${STATUS_LABELS[h.new_status] || h.new_status}`
                          : `criou com status ${STATUS_LABELS[h.new_status] || h.new_status}`}
                      </p>
                      {h.observation && (
                        <p className="text-sm text-slate-500 mt-1 italic bg-slate-50 rounded px-3 py-2">
                          &quot;{h.observation}&quot;
                        </p>
                      )}
                      <p className="text-xs text-slate-400 mt-1">
                        {format(new Date(h.timestamp), "dd/MM/yyyy 'as' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Attachments */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-slate-700">Anexos</h2>
              <label className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium cursor-pointer">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {uploading ? 'Enviando...' : 'Upload'}
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
              </label>
            </div>
            {demand.attachments && demand.attachments.length > 0 ? (
              <div className="space-y-2">
                {demand.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <svg className="w-5 h-5 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                      </svg>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{att.filename}</p>
                        <p className="text-xs text-slate-400">
                          {att.uploaded_by_name} - {format(new Date(att.uploaded_at), 'dd/MM/yyyy', { locale: ptBR })}
                          {' - '}
                          {(att.file_size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <a
                      href={`/api/demands/${demand.id}/attachments/${att.id}`}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex-shrink-0"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400 text-center py-4">Nenhum anexo</p>
            )}
          </div>
        </div>

        {/* Sidebar: Actions */}
        <div className="space-y-6">
          {/* Transition Buttons */}
          {transitions.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-3">Acoes</h2>
              <div className="space-y-2">
                {transitions.map((t) => (
                  <button
                    key={t}
                    onClick={() => handleTransition(t)}
                    disabled={submitting}
                    className="w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {STATUS_LABELS[t] || t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Info */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-3">Resumo</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Anexos</span>
                <span className="text-slate-900 font-medium">{demand.attachments?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Alteracoes</span>
                <span className="text-slate-900 font-medium">{demand.history?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Ultima atualizacao</span>
                <span className="text-slate-900 font-medium">
                  {format(new Date(demand.updated_at), 'dd/MM', { locale: ptBR })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Observation Modal */}
      {transitionTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {STATUS_LABELS[transitionTarget] || transitionTarget}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Informe o motivo para esta transicao.
            </p>
            <textarea
              value={observation}
              onChange={(e) => setObservation(e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 mb-4"
              placeholder="Observacao..."
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setTransitionTarget(null)
                  setObservation('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => doTransition(transitionTarget, observation)}
                disabled={submitting || !observation.trim()}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Conclude Modal */}
      {showConclude && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Concluir Orcamento</h3>
            <p className="text-sm text-slate-500 mb-4">
              Informe o valor estimado do orcamento.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Valor (R$)</label>
              <input
                type="number"
                value={concludeValue}
                onChange={(e) => setConcludeValue(e.target.value)}
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
                  setShowConclude(false)
                  setConcludeValue('')
                }}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleConclude}
                disabled={submitting || !concludeValue}
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Salvando...' : 'Concluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
