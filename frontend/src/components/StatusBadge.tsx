import type { DemandStatusType } from '@/types';

const statusConfig: Record<string, { label: string; className: string }> = {
  nova: {
    label: 'Nova',
    className: 'bg-blue-100 text-blue-800',
  },
  em_triagem: {
    label: 'Em Triagem',
    className: 'bg-yellow-100 text-yellow-800',
  },
  pendencia: {
    label: 'Pendência',
    className: 'bg-red-100 text-red-800',
  },
  em_projeto: {
    label: 'Em Projeto',
    className: 'bg-purple-100 text-purple-800',
  },
  em_desenvolvimento: {
    label: 'Em Desenvolvimento',
    className: 'bg-orange-100 text-orange-800',
  },
  orcado: {
    label: 'Orçado',
    className: 'bg-green-100 text-green-800',
  },
  proposta_enviada: {
    label: 'Proposta Enviada',
    className: 'bg-cyan-100 text-cyan-800',
  },
  fechado: {
    label: 'Fechado',
    className: 'bg-gray-100 text-gray-800',
  },
};

interface StatusBadgeProps {
  status: DemandStatusType;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status] || {
    label: status,
    className: 'bg-gray-100 text-gray-800',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}
