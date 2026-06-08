import { useState, useEffect, useCallback } from 'react';
import { getKanban } from '@/api/demands';
import type { Demand, DemandStatusType } from '@/types';
import { DemandStatus } from '@/types';
import PriorityBadge from '@/components/PriorityBadge';
import DemandSlideOver from '@/components/DemandSlideOver';
import Spinner from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { FolderKanban } from 'lucide-react';

const columnConfig: { key: DemandStatusType; label: string; color: string }[] =
  [
    {
      key: DemandStatus.NOVA,
      label: 'Nova',
      color: 'border-t-blue-500',
    },
    {
      key: DemandStatus.EM_TRIAGEM,
      label: 'Em Triagem',
      color: 'border-t-yellow-500',
    },
    {
      key: DemandStatus.PENDENCIA,
      label: 'Pendência',
      color: 'border-t-red-500',
    },
    {
      key: DemandStatus.EM_PROJETO,
      label: 'Em Projeto',
      color: 'border-t-purple-500',
    },
    {
      key: DemandStatus.EM_DESENVOLVIMENTO,
      label: 'Em Desenvolvimento',
      color: 'border-t-orange-500',
    },
    {
      key: DemandStatus.ORCADO,
      label: 'Orçado',
      color: 'border-t-green-500',
    },
    {
      key: DemandStatus.PROPOSTA_ENVIADA,
      label: 'Proposta Enviada',
      color: 'border-t-cyan-500',
    },
    {
      key: DemandStatus.FECHADO,
      label: 'Fechado',
      color: 'border-t-gray-500',
    },
  ];

export default function KanbanBoard() {
  const [kanbanData, setKanbanData] = useState<Record<string, Demand[]>>({});
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchKanban = useCallback(async () => {
    try {
      const data = await getKanban();
      setKanbanData(data);
    } catch {
      showToast('Erro ao carregar kanban', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKanban();
  }, [fetchKanban]);

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <FolderKanban className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">Kanban</h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Visão geral de todas as demandas por status.
        </p>
      </div>

      <div className="flex flex-1 gap-4 overflow-x-auto pb-4">
        {columnConfig.map((col) => {
          const demands = kanbanData[col.key] || [];
          return (
            <div
              key={col.key}
              className="flex w-72 flex-shrink-0 flex-col"
            >
              <div
                className={`mb-3 rounded-t-lg border-t-4 bg-white px-3 py-2 shadow-sm ${col.color}`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">
                    {col.label}
                  </h3>
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                    {demands.length}
                  </span>
                </div>
              </div>

              <div className="flex-1 space-y-2 overflow-y-auto">
                {demands.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-gray-200 px-3 py-8 text-center">
                    <p className="text-xs text-gray-400">Nenhuma demanda</p>
                  </div>
                ) : (
                  demands.map((demand) => (
                    <div
                      key={demand.id}
                      onClick={() => setSelectedId(demand.id)}
                      className="cursor-pointer rounded-lg border border-gray-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <h4 className="text-sm font-medium text-gray-900">
                        {demand.titulo}
                      </h4>
                      <p className="mt-1 text-xs text-gray-500">
                        {demand.campaign?.cliente || ''}
                      </p>
                      <div className="mt-2 flex items-center justify-between">
                        <PriorityBadge priority={demand.prioridade} />
                        {demand.assigned_to && (
                          <span className="text-xs text-gray-400">
                            {demand.assigned_to.nome}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selectedId && (
        <DemandSlideOver
          demandId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={fetchKanban}
        />
      )}
    </div>
  );
}
