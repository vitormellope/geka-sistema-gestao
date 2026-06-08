'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, differenceInMinutes } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import type { Demand, HistoryEntry, Status, Priority } from '@/types'
import { StatusBadge } from './StatusBadge'
import { PriorityBadge } from './PriorityBadge'
import toast from 'react-hot-toast'

interface DemandSlideOverProps {
  demandId: number | null
  onClose: () => void
  onStatusChange?: () => void
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

interface TransitionDef {
  label: string
  target: Status
  roles: string[]
  requiresObs?: boolean
  requiresSla?: boolean
  danger?: boolean
}

const STATUS_TRANSITIONS: Record<string, TransitionDef[]> = {
  nova: [
    { label: 'Iniciar Triagem', target: 'em_triagem', roles: ['orcamentista', 'gerente'] },
    { label: 'Orçamento Direto', target: 'orcamento_direto', roles: ['orcamentista', 'gerente'], requiresSla: true },
    { label: 'Enviar para Decupagem', target: 'projeto_decupagem', roles: ['orcamentista', 'gerente'], requiresSla: true },
    { label: 'Solicitar Informação', target: 'pendencia_informacao', roles: ['orcamentista', 'gerente'], requiresObs: true },
  ],
  em_triagem: [
    { label: 'Orçamento Direto', target: 'orcamento_direto', roles: ['orcamentista', 'gerente'], requiresSla: true },
    { label: 'Enviar para Decupagem', target: 'projeto_decupagem', roles: ['orcamentista', 'gerente'], requiresSla: true },
    { label: 'Solicitar Informação', target: 'pendencia_informacao', roles: ['orcamentista', 'gerente'], requiresObs: true },
  ],
  pendencia_informacao: [
    { label: 'Voltar para Fila', target: 'nova', roles: ['vendedor', 'assistente'] },
  ],
  orcamento_direto: [
    { label: 'Concluir Orçamento', target: 'orcado', roles: ['orcamentista', 'gerente'] },
    { label: 'Solicitar Informação', target: 'pendencia_informacao', roles: ['orcamentista', 'gerente'], requiresObs: true },
    { label: 'Cancelar Demanda', target: 'cancelada', roles: ['orcamentista', 'gerente'], danger: true },
  ],
  projeto_decupagem: [
    { label: 'Enviar para Orçamento', target: 'orcamento_direto', roles: ['projetista', 'orcamentista', 'gerente'], requiresSla: true },
    { label: 'Solicitar Informação', target: 'pendencia_informacao', roles: ['projetista', 'orcamentista', 'gerente'], requiresObs: true },
    { label: 'Cancelar Demanda', target: 'cancelada', roles: ['projetista', 'orcamentista', 'gerente'], danger: true },
  ],
  orcado: [
    { label: 'Marcar Proposta como Enviada', target: 'proposta_enviada', roles: ['vendedor', 'assistente', 'gerente'] },
  ],
  proposta_enviada: [
    { label: 'Marcar como Fechado', target: 'fechado', roles: ['vendedor', 'assistente', 'gerente'] },
    { label: 'Retornar para Orçamento', target: 'orcamento_direto', roles: ['orcamentista', 'gerente'], requiresSla: true },
  ],
}

export function DemandSlideOver({ demandId, onClose, onStatusChange }: DemandSlideOverProps) {
  const { data: session } = useSession()
  const [demand, setDemand] = useState<Demand | null>(null)
  const [loading, setLoading] = useState(false)
  const [visible, setVisible] = useState(false)
  const [activeTransition, setActiveTransition] = useState<TransitionDef | null>(null)
  const [observation, setObservation] = useState('')
  const [slaDate, setSlaDate] = useState('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [estimatedValue, setEstimatedValue] = useState('')
  const [editMode, setEditMode] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editClient, setEditClient] = useState('')
  const [editDeadline, setEditDeadline] = useState('')
  const [editPriority, setEditPriority] = useState<Priority>('normal')
  const [editFieldValues, setEditFieldValues] = useState<Record<string, string>>({})
  const [saveLoading, setSaveLoading] = useState(false)

  const loadDemand = useCallback(async () => {
    if (demandId == null) return
    setLoading(true)
    try {
      const res = await fetch(`/api/demands/${demandId}`)
      if (res.ok) setDemand(await res.json())
    } catch {
      toast.error('Erro ao carregar demanda')
    } finally {
      setLoading(false)
    }
  }, [demandId])

  useEffect(() => {
    if (demandId != null) {
      setVisible(true)
      setEditMode(false)
      setActiveTransition(null)
      loadDemand()
    } else {
      setVisible(false)
      setDemand(null)
    }
  }, [demandId, loadDemand])

  useEffect(() => {
    if (demandId == null) return
    const interval = setInterval(loadDemand, 15000)
    return () => clearInterval(interval)
  }, [demandId, loadDemand])

  const handleClose = () => {
    setVisible(false)
    setTimeout(onClose, 200)
  }

  const handleSelectTransition = (t: TransitionDef) => {
    setActiveTransition(t)
    setObservation('')
    setSlaDate('')
    setEstimatedValue('')
  }

  const handleRoute = async () => {
    if (!demand || !activeTransition) return

    if (activeTransition.target === 'orcado') {
      if (!estimatedValue || Number(estimatedValue) <= 0) {
        toast.error('Informe o valor do orçamento')
        return
      }
      setRouteLoading(true)
      try {
        const res = await fetch(`/api/demands/${demand.id}/conclude`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ estimated_value: Number(estimatedValue), observation: observation.trim() || undefined }),
        })
        if (!res.ok) throw new Error()
        toast.success('Orçamento concluído!')
        setActiveTransition(null)
        loadDemand()
        onStatusChange?.()
      } catch {
        toast.error('Erro ao concluir orçamento')
      } finally {
        setRouteLoading(false)
      }
      return
    }

    if (activeTransition.requiresObs && !observation.trim()) {
      toast.error('Observação obrigatória')
      return
    }
    setRouteLoading(true)
    try {
      const res = await fetch(`/api/demands/${demand.id}/route-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: activeTransition.target, observation: observation.trim() || undefined, sla_date: slaDate || undefined }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status atualizado!')
      setActiveTransition(null)
      loadDemand()
      onStatusChange?.()
    } catch {
      toast.error('Erro ao atualizar status')
    } finally {
      setRouteLoading(false)
    }
  }

  const enterEditMode = () => {
    if (!demand) return
    setEditTitle(demand.title)
    setEditClient(demand.client)
    setEditDeadline(demand.deadline ? demand.deadline.split('T')[0] : '')
    setEditPriority(demand.priority)
    setEditFieldValues({ ...(demand.field_values ?? {}) })
    setEditMode(true)
  }

  const handleSaveEdit = async () => {
    if (!demand) return
    setSaveLoading(true)
    try {
      const res = await fetch(`/api/demands/${demand.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle, client: editClient, deadline: editDeadline || null, priority: editPriority, field_values: editFieldValues }),
      })
      if (!res.ok) throw new Error()
      toast.success('Demanda atualizada!')
      setEditMode(false)
      loadDemand()
      onStatusChange?.()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setSaveLoading(false)
    }
  }

  if (demandId == null) return null

  const role = session?.user?.role ?? ''
  const availableTransitions = demand ? (STATUS_TRANSITIONS[demand.status] ?? []).filter((t) => t.roles.includes(role)) : []
  const historyWithDuration: (HistoryEntry & { duration?: number })[] = demand?.history
    ? demand.history.map((entry, idx) => {
        const next = demand.history![idx + 1]
        return { ...entry, duration: next ? differenceInMinutes(new Date(next.timestamp), new Date(entry.timestamp)) : undefined }
      })
    : []

  return (
    <>
      <div className={`fixed inset-0 z-50 bg-black/50 transition-opacity duration-200 ${visible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={handleClose} />
      <div className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white shadow-2xl z-50 flex flex-col transform transition-transform duration-200 ${visible ? 'translate-x-0' : 'translate-x-full'}`}>
        {loading && !demand ? (
          <div className="flex-1 flex items-center justify-center"><span className="spinner w-8 h-8" /></div>
        ) : demand ? (
          <>
            <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-slate-50">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="text-xs font-mono text-slate-400 bg-slate-200 px-2 py-0.5 rounded">#{demand.id}</span>
                    <StatusBadge status={demand.status} size="sm" />
                    <PriorityBadge priority={demand.priority} size="sm" />
                  </div>
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">{demand.title}</h2>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {!editMode && ['nova', 'pendencia_informacao'].includes(demand.status) && (
                    <button onClick={enterEditMode} className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50">Editar</button>
                  )}
                  <button onClick={handleClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200 text-xl font-bold">&times;</button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {editMode ? (
                <div className="space-y-4">
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Editar Demanda</h3>
                  <div className="space-y-3">
                    <div><label className="text-xs text-slate-500 block mb-1">Título</label><input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="input-field" /></div>
                    <div><label className="text-xs text-slate-500 block mb-1">Cliente</label><input type="text" value={editClient} onChange={(e) => setEditClient(e.target.value)} className="input-field" /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><label className="text-xs text-slate-500 block mb-1">Prazo</label><input type="date" value={editDeadline} onChange={(e) => setEditDeadline(e.target.value)} className="input-field" /></div>
                      <div><label className="text-xs text-slate-500 block mb-1">Prioridade</label>
                        <select value={editPriority} onChange={(e) => setEditPriority(e.target.value as Priority)} className="input-field">
                          <option value="urgente">Urgente</option><option value="alta">Alta</option><option value="normal">Normal</option>
                        </select>
                      </div>
                    </div>
                    {Object.keys(editFieldValues).length > 0 && (
                      <div className="space-y-2">
                        {Object.entries(editFieldValues).map(([key, val]) => (
                          <div key={key}><label className="text-xs text-slate-400 block mb-0.5 capitalize">{key.replace(/_/g, ' ')}</label>
                            <input type="text" value={val} onChange={(e) => setEditFieldValues(prev => ({ ...prev, [key]: e.target.value }))} className="input-field" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} disabled={saveLoading} className="btn-primary flex-1">{saveLoading ? <span className="spinner w-4 h-4" /> : 'Salvar'}</button>
                    <button onClick={() => setEditMode(false)} className="btn-secondary flex-1">Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Informações</h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                      <div><p className="text-xs text-slate-400 mb-0.5">Cliente</p><p className="font-medium text-slate-900">{demand.client}</p></div>
                      <div><p className="text-xs text-slate-400 mb-0.5">Categoria</p><p className="font-medium text-slate-900">{demand.category_name}</p></div>
                      <div><p className="text-xs text-slate-400 mb-0.5">Prazo</p><p className="font-medium text-slate-900">{demand.deadline ? format(new Date(demand.deadline), 'dd/MM/yyyy') : '—'}</p></div>
                      <div><p className="text-xs text-slate-400 mb-0.5">Data SLA</p><p className="font-medium text-slate-900">{demand.sla_date ? format(new Date(demand.sla_date), 'dd/MM/yyyy') : '—'}</p></div>
                      <div><p className="text-xs text-slate-400 mb-0.5">Vendedor</p><p className="font-medium text-slate-900">{demand.seller_name}</p></div>
                      <div><p className="text-xs text-slate-400 mb-0.5">Assistente</p><p className="font-medium text-slate-900">{demand.assistant_name ?? '—'}</p></div>
                      {demand.estimated_value != null && (
                        <div><p className="text-xs text-slate-400 mb-0.5">Valor Estimado</p><p className="font-medium text-green-700">{demand.estimated_value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p></div>
                      )}
                    </div>
                  </div>

                  {demand.field_values && Object.keys(demand.field_values).length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Campos Adicionais</h3>
                      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                        {Object.entries(demand.field_values).map(([key, value]) => (
                          <div key={key}><p className="text-xs text-slate-400 mb-0.5 capitalize">{key.replace(/_/g, ' ')}</p><p className="font-medium text-slate-900">{String(value) === 'true' ? 'Sim' : String(value) === 'false' ? 'Não' : String(value)}</p></div>
                        ))}
                      </div>
                    </div>
                  )}

                  {demand.attachments && demand.attachments.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Anexos</h3>
                      <div className="space-y-2">
                        {demand.attachments.map((att) => (
                          <div key={att.id} className="flex items-center justify-between bg-slate-50 rounded-lg px-3 py-2 border border-slate-200">
                            <div className="flex items-center gap-2 min-w-0">
                              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" /></svg>
                              <span className="text-sm text-slate-700 truncate">{att.filename}</span>
                              <span className="text-xs text-slate-400">{(att.file_size / 1024).toFixed(0)} KB</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {availableTransitions.length > 0 && (
                    <div>
                      <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Ações</h3>
                      {activeTransition ? (
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-200 space-y-3">
                          <p className="text-sm font-medium text-slate-800">{activeTransition.label}</p>
                          {activeTransition.target === 'orcado' && (
                            <div><label className="text-xs text-slate-500 block mb-1">Valor do Orçamento (R$) *</label>
                              <input type="number" step="0.01" min="0" value={estimatedValue} onChange={(e) => setEstimatedValue(e.target.value)} className="input-field" placeholder="0,00" />
                            </div>
                          )}
                          {activeTransition.requiresSla && (
                            <div><label className="text-xs text-slate-500 block mb-1">Data SLA</label>
                              <input type="date" value={slaDate} onChange={(e) => setSlaDate(e.target.value)} className="input-field" />
                            </div>
                          )}
                          {activeTransition.requiresObs ? (
                            <div><label className="text-xs text-slate-500 block mb-1">Observação *</label>
                              <textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={3} placeholder="Descreva o motivo..." className="input-field resize-none" />
                            </div>
                          ) : (
                            <div><label className="text-xs text-slate-500 block mb-1">Observação</label>
                              <textarea value={observation} onChange={(e) => setObservation(e.target.value)} rows={2} placeholder="Observação (opcional)" className="input-field resize-none" />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <button onClick={handleRoute} disabled={routeLoading} className={`btn-primary flex-1 ${activeTransition.danger ? '!bg-red-600 hover:!bg-red-700' : activeTransition.target === 'fechado' ? '!bg-green-600 hover:!bg-green-700' : ''}`}>
                              {routeLoading ? <span className="spinner w-4 h-4" /> : 'Confirmar'}
                            </button>
                            <button onClick={() => setActiveTransition(null)} className="btn-secondary flex-1">Cancelar</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {availableTransitions.map((t) => (
                            <button key={t.target} onClick={() => handleSelectTransition(t)} className={`text-sm font-medium px-3 py-2 rounded-lg transition-colors ${t.danger ? 'bg-red-100 text-red-700 hover:bg-red-200' : t.target === 'fechado' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {!editMode && demand.history && demand.history.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Histórico</h3>
                  <div className="relative">
                    <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-slate-200" />
                    <div className="space-y-4">
                      {historyWithDuration.map((entry) => (
                        <div key={entry.id} className="relative flex gap-4 pl-8">
                          <div className="absolute left-1.5 top-1.5 w-3 h-3 bg-blue-400 rounded-full border-2 border-white" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-900">{entry.user_name}</span>
                              {entry.prev_status && (<><span className="text-xs text-slate-400">de</span><StatusBadge status={entry.prev_status} size="sm" /><span className="text-xs text-slate-400">para</span></>)}
                              <StatusBadge status={entry.new_status} size="sm" />
                              {entry.duration != null && <span className="text-xs text-slate-400 italic">({formatDuration(entry.duration)})</span>}
                            </div>
                            {entry.observation && <p className="text-xs text-slate-600 mt-1 bg-slate-50 rounded px-2 py-1">{entry.observation}</p>}
                            <p className="text-xs text-slate-400 mt-0.5">{format(new Date(entry.timestamp), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-400"><p>Demanda não encontrada</p></div>
        )}
      </div>
    </>
  )
}
