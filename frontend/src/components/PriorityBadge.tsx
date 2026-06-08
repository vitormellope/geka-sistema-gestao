import type { PriorityType } from '@/types';

const priorityConfig: Record<string, { label: string; className: string }> = {
  baixa: {
    label: 'Baixa',
    className: 'bg-gray-100 text-gray-700',
  },
  media: {
    label: 'Média',
    className: 'bg-blue-100 text-blue-700',
  },
  alta: {
    label: 'Alta',
    className: 'bg-orange-100 text-orange-700',
  },
  urgente: {
    label: 'Urgente',
    className: 'bg-red-100 text-red-700',
  },
};

interface PriorityBadgeProps {
  priority: PriorityType;
}

export default function PriorityBadge({ priority }: PriorityBadgeProps) {
  const config = priorityConfig[priority] || {
    label: priority,
    className: 'bg-gray-100 text-gray-700',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
