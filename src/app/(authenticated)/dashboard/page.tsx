'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import type { Demand, Category, Campaign, Status, Role } from '@/types'
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

// ---- Kanban Column Definitions ----
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

// Map column IDs to their target status for drop transitions
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
      {demand.category_name && (
        <p className="text-xs text-slate-400 mt-1">{demand.category_name}</p>
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
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)]">
        {demands.map((d) => (
          <DraggableCard key={d.id} demand={d} onClick={() => onCardClick(d.id)} />
        ))}
        {demands.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">Nenhuma demanda</p>
        )}
      </div>
    </div>
  )
}

// ---- Vendedor / Assistente Kanban Dashboard ----
function VendedorDashboard({
  demands,
  categories,
  campaigns,
  onReload,
}: {
  demands: Demand[]
  categories: Category[]
  campaigns: Campaign[]
  onReload: () => void
}) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [campaignFilter, setCampaignFilter] = useState('')
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null)

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  )

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

    // Only allow: orcado -> proposta_enviada -> fechado
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
        onReload()
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || 'Erro ao alterar status')
      }
    } catch {
      toast.error('Erro ao alterar status')
    }
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Painel Comercial</h1>
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
          onStatusChange={onReload}
        />
      )}
    </div>
  )
}

// ---- Stat Card Component ----
function StatCard({
  label,
  value,
  color = 'blue',
  href,
}: {
  label: string
  value: string | number
  color?: 'blue' | 'green' | 'orange' | 'purple' | 'slate' | 'emerald'
  href?: string
}) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-green-50 text-green-600 border-green-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    slate: 'bg-slate-50 text-slate-600 border-slate-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
  }

  const content = (
    <div className={`p-6 rounded-xl border ${colorMap[color]} ${href ? 'hover:shadow-md cursor-pointer transition-shadow' : ''}`}>
      <p className="text-sm font-medium opacity-75 mb-1">{label}</p>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }
  return content
}

// ---- Gerente Dashboard ----
function GerenteDashboard({ demands }: { demands: Demand[] }) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const totalDemandas = demands.length
  const emTriagem = demands.filter(
    (d) => d.status === 'nova' || d.status === 'em_triagem'
  ).length
  const orcadasEsteMes = demands.filter(
    (d) =>
      d.status === 'orcado' &&
      new Date(d.updated_at).getMonth() === currentMonth &&
      new Date(d.updated_at).getFullYear() === currentYear
  ).length
  const fechadasEsteMes = demands.filter(
    (d) =>
      d.status === 'fechado' &&
      new Date(d.updated_at).getMonth() === currentMonth &&
      new Date(d.updated_at).getFullYear() === currentYear
  ).length

  const abertas = demands.filter(
    (d) => !['fechado', 'cancelada'].includes(d.status) && d.estimated_value
  )
  const valorAberto = abertas.reduce((sum, d) => sum + (d.estimated_value || 0), 0)
  const fechadas = demands.filter(
    (d) =>
      d.status === 'fechado' &&
      d.estimated_value &&
      new Date(d.updated_at).getMonth() === currentMonth &&
      new Date(d.updated_at).getFullYear() === currentYear
  )
  const valorFechado = fechadas.reduce((sum, d) => sum + (d.estimated_value || 0), 0)

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard Gerencial</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Total de Demandas" value={totalDemandas} color="blue" />
        <StatCard label="Em Triagem / Abertas" value={emTriagem} color="orange" href="/queue/triage" />
        <StatCard label="Orcadas este mes" value={orcadasEsteMes} color="purple" />
        <StatCard label="Fechadas este mes" value={fechadasEsteMes} color="green" />
        <StatCard label="Valor Total em Aberto" value={formatCurrency(valorAberto)} color="slate" />
        <StatCard label="Valor Fechado este mes" value={formatCurrency(valorFechado)} color="emerald" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/kanban"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow text-center"
        >
          <p className="text-sm text-slate-500">Fluxo Comercial</p>
          <p className="text-lg font-semibold text-blue-600 mt-1">Kanban &rarr;</p>
        </Link>
        <Link
          href="/campaigns"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow text-center"
        >
          <p className="text-sm text-slate-500">Campanhas</p>
          <p className="text-lg font-semibold text-blue-600 mt-1">Ver Todas &rarr;</p>
        </Link>
        <Link
          href="/demands"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow text-center"
        >
          <p className="text-sm text-slate-500">Demandas</p>
          <p className="text-lg font-semibold text-blue-600 mt-1">Listar &rarr;</p>
        </Link>
        <Link
          href="/users"
          className="p-4 bg-white border border-slate-200 rounded-xl hover:shadow-md transition-shadow text-center"
        >
          <p className="text-sm text-slate-500">Usuarios</p>
          <p className="text-lg font-semibold text-blue-600 mt-1">Gerenciar &rarr;</p>
        </Link>
      </div>
    </div>
  )
}

// ---- Orcamentista Dashboard ----
function OrcamentistaDashboard({ demands }: { demands: Demand[] }) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const triagem = demands.filter(
    (d) => d.status === 'nova' || d.status === 'em_triagem'
  ).length
  const direto = demands.filter((d) => d.status === 'orcamento_direto').length
  const orcadoMes = demands.filter(
    (d) =>
      d.status === 'orcado' &&
      new Date(d.updated_at).getMonth() === currentMonth &&
      new Date(d.updated_at).getFullYear() === currentYear
  ).length

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard do Orcamentista</h1>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Fila de Triagem"
          value={triagem}
          color="orange"
          href="/queue/triage"
        />
        <StatCard
          label="Orcamento Direto"
          value={direto}
          color="purple"
          href="/queue/direct"
        />
        <StatCard
          label="Total Orcado este mes"
          value={orcadoMes}
          color="emerald"
        />
      </div>
    </div>
  )
}

// ---- Projetista Dashboard ----
function ProjetistaDashboard({ demands }: { demands: Demand[] }) {
  const decupagem = demands.filter(
    (d) => d.status === 'projeto_decupagem'
  ).length
  const total = demands.length

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 mb-6">Dashboard do Projetista</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          label="Em Decupagem"
          value={decupagem}
          color="purple"
          href="/queue/project"
        />
        <StatCard
          label="Total Atribuido"
          value={total}
          color="blue"
        />
      </div>
    </div>
  )
}

// ---- Main Dashboard Page ----
export default function DashboardPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()
  const [demands, setDemands] = useState<Demand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(async () => {
    try {
      const [demandsRes, categoriesRes, campaignsRes] = await Promise.all([
        fetch('/api/demands'),
        fetch('/api/categories'),
        fetch('/api/campaigns'),
      ])
      if (demandsRes.ok) setDemands(await demandsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (campaignsRes.ok) setCampaigns(await campaignsRes.json())
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadData()
  }, [authStatus, loadData])

  if (authStatus === 'loading' || loading) return <PageSpinner />
  if (!session?.user) return null

  const role = session.user.role as Role

  switch (role) {
    case 'vendedor':
    case 'assistente':
      return (
        <VendedorDashboard
          demands={demands}
          categories={categories}
          campaigns={campaigns}
          onReload={loadData}
        />
      )
    case 'gerente':
      return <GerenteDashboard demands={demands} />
    case 'orcamentista':
      return <OrcamentistaDashboard demands={demands} />
    case 'projetista':
      return <ProjetistaDashboard demands={demands} />
    default:
      return (
        <div className="text-center py-12">
          <p className="text-slate-500">Role nao reconhecido: {role}</p>
        </div>
      )
  }
}
