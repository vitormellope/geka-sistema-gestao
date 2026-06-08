'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Demand, Category, Campaign, Status } from '@/types'
import { StatusBadge } from '@/components/StatusBadge'
import { PriorityBadge } from '@/components/PriorityBadge'
import { PageSpinner } from '@/components/Spinner'
import { DemandSlideOver } from '@/components/DemandSlideOver'
import { STATUS_LABELS } from '@/lib/transitions'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import toast from 'react-hot-toast'
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  useDraggable,
  type DragEndEvent,
} from '@dnd-kit/core'

interface KanbanColumnDef {
  id: string
  title: string
  statuses: Status[]
}

const KANBAN_COLUMNS: KanbanColumnDef[] = [
  {
    id: 'em_desenvolvimento',
    title: 'Em Desenvolvimento',
    statuses: ['nova', 'em_triagem', 'pendencia_informacao', 'orcamento_direto', 'projeto_decupagem'],
  },
  { id: 'orcado', title: 'Orcado', statuses: ['orcado'] },
  { id: 'proposta_enviada', title: 'Proposta Enviada', statuses: ['proposta_enviada'] },
  { id: 'fechado', title: 'Fechado', statuses: ['fechado'] },
]

const COLUMN_TARGET_STATUS: Record<string, Status> = {
  orcado: 'orcado',
  proposta_enviada: 'proposta_enviada',
  fechado: 'fechado',
}

// ---- Draggable Card ----
function DraggableCard({
  demand,
  onClick,
}: {
  demand: Demand
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `demand-${demand.id}`,
    data: { demand },
  })

  const style = transform
    ? { transform: `translate(${transform.x}px, ${transform.y}px)`, opacity: isDragging ? 0.5 : 1 }
    : undefined

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={onClick}
      className="bg-white rounded-lg border border-slate-200 p-3 cursor-pointer hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-900 line-clamp-2">
          <span className="text-slate-400 text-xs">#{demand.id}</span> {demand.title}
        </p>
        <PriorityBadge priority={demand.priority} size="sm" />
      </div>
      <p className="text-xs text-slate-500 mb-2">{demand.client}</p>
      <div className="flex items-center justify-between gap-2">
        <StatusBadge status={demand.status} size="sm" />
        {demand.deadline && (
          <span className="text-xs text-slate-400">
            {format(new Date(demand.deadline), 'dd/MM', { locale: ptBR })}
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mt-1">{demand.category_name}</p>
      {demand.estimated_value != null && demand.estimated_value > 0 && (
        <p className="text-xs font-medium text-emerald-600 mt-1">
          R$ {demand.estimated_value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </p>
      )}
    </div>
  )
}

// ---- Droppable Column ----
function DroppableColumn({
  column,
  demands,
  onCardClick,
}: {
  column: KanbanColumnDef
  demands: Demand[]
  onCardClick: (id: number) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  const totalValue = demands.reduce((sum, d) => sum + (d.estimated_value || 0), 0)

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] max-w-[340px] flex flex-col bg-slate-100 rounded-xl ${
        isOver ? 'ring-2 ring-blue-400' : ''
      }`}
    >
      <div className="px-4 py-3 border-b border-slate-200">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">{column.title}</h3>
          <span className="bg-slate-200 text-slate-600 text-xs font-medium rounded-full px-2 py-0.5">
            {demands.length}
          </span>
        </div>
      </div>
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-320px)]">
        {demands.map((d) => (
          <DraggableCard key={d.id} demand={d} onClick={() => onCardClick(d.id)} />
        ))}
        {demands.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nenhuma demanda</p>
        )}
      </div>
      {/* Footer with count and total value */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50 rounded-b-xl">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{demands.length} demanda{demands.length !== 1 ? 's' : ''}</span>
          {totalValue > 0 && (
            <span className="font-medium text-slate-700">
              R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function KanbanBoardPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [demands, setDemands] = useState<Demand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null)

  // Filters
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

  const loadData = useCallback(async () => {
    try {
      const [demandsRes, catRes, campRes] = await Promise.all([
        fetch('/api/demands'),
        fetch('/api/categories'),
        fetch('/api/campaigns'),
      ])
      if (demandsRes.ok) setDemands(await demandsRes.json())
      if (catRes.ok) setCategories(await catRes.json())
      if (campRes.ok) setCampaigns(await campRes.json())
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadData()
  }, [authStatus, loadData])

  const filteredDemands = useMemo(() => {
    return demands.filter((d) => {
      if (search) {
        const q = search.toLowerCase()
        if (
          !d.title.toLowerCase().includes(q) &&
          !d.client.toLowerCase().includes(q) &&
          !`#${d.id}`.includes(q)
        )
          return false
      }
      if (categoryFilter && d.category_id !== Number(categoryFilter)) return false
      if (campaignFilter && d.campaign_id !== Number(campaignFilter)) return false
      return true
    })
  }, [demands, search, categoryFilter, campaignFilter])

  const columnDemands = useMemo(() => {
    const result: Record<string, Demand[]> = {}
    for (const col of KANBAN_COLUMNS) {
      result[col.id] = filteredDemands.filter((d) => col.statuses.includes(d.status))
    }
    return result
  }, [filteredDemands])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over) return

    const columnId = over.id as string
    const targetStatus = COLUMN_TARGET_STATUS[columnId]
    if (!targetStatus) return

    const demand = (active.data.current as { demand: Demand }).demand
    if (demand.status === targetStatus) return

    const allowed =
      (demand.status === 'orcado' && targetStatus === 'proposta_enviada') ||
      (demand.status === 'proposta_enviada' && targetStatus === 'fechado')

    if (!allowed) {
      toast.error('Transicao nao permitida')
      return
    }

    try {
      const res = await fetch(`/api/demands/${demand.id}/route-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_status: targetStatus }),
      })
      if (res.ok) {
        toast.success(`Status alterado para ${STATUS_LABELS[targetStatus]}`)
        loadData()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao alterar status')
      }
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Fluxo Comercial</h1>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <input
          type="text"
          placeholder="Buscar por titulo, cliente ou #ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todas Categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
          className="border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">Todas Campanhas</option>
          {campaigns.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Kanban Board */}
      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_COLUMNS.map((col) => (
            <DroppableColumn
              key={col.id}
              column={col}
              demands={columnDemands[col.id] || []}
              onCardClick={setSelectedDemandId}
            />
          ))}
        </div>
      </DndContext>

      {selectedDemandId && (
        <DemandSlideOver
          demandId={selectedDemandId}
          onClose={() => setSelectedDemandId(null)}
          onStatusChange={loadData}
        />
      )}
    </div>
  )
}
