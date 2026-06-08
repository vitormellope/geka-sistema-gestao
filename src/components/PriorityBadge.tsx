'use client'

import type { Priority } from '@/types'

const priorityConfig: Record<Priority, { label: string; className: string; dot: string }> = {
  urgente: { label: 'Urgente', className: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  alta: { label: 'Alta', className: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  normal: { label: 'Normal', className: 'bg-slate-50 text-slate-600 ring-slate-200', dot: 'bg-slate-400' },
}

interface Props {
  priority: Priority
  size?: 'sm' | 'md'
}

export function PriorityBadge({ priority, size = 'md' }: Props) {
  const config = priorityConfig[priority]
  if (!config) return null
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ring-1 ring-inset ${sizeClass} ${config.className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  )
}
