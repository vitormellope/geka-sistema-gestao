'use client'

import type { Status } from '@/types'

const statusConfig: Record<Status, { label: string; className: string }> = {
  nova: { label: 'Nova', className: 'bg-blue-100 text-blue-800' },
  em_triagem: { label: 'Em Triagem', className: 'bg-yellow-100 text-yellow-800' },
  pendencia_informacao: { label: 'Pendência', className: 'bg-orange-100 text-orange-800' },
  orcamento_direto: { label: 'Orçamento Direto', className: 'bg-purple-100 text-purple-800' },
  projeto_decupagem: { label: 'Projeto/Decupagem', className: 'bg-indigo-100 text-indigo-800' },
  orcado: { label: 'Orçado', className: 'bg-emerald-100 text-emerald-800' },
  proposta_enviada: { label: 'Proposta Enviada', className: 'bg-teal-100 text-teal-800' },
  fechado: { label: 'Fechado', className: 'bg-green-200 text-green-900' },
  cancelada: { label: 'Cancelada', className: 'bg-red-100 text-red-800' },
}

interface Props {
  status: Status
  size?: 'sm' | 'md'
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status]
  if (!config) return null
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${sizeClass} ${config.className}`}>
      {config.label}
    </span>
  )
}

export function statusLabel(status: Status): string {
  return statusConfig[status]?.label ?? status
}
