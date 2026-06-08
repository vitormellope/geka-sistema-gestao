import { useState, useEffect, useCallback } from 'react';
import { getProjectQueue, changeStatus } from '@/api/demands';
import type { Demand } from '@/types';
import { DemandStatus } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import DemandSlideOver from '@/components/DemandSlideOver';
import Spinner from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { Inbox, ArrowRight, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DecupageQueue() {
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [observacoes, setObservacoes] = useState<Record<number, string>>({});
  const [processing, setProcessing] = useState<number | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const data = await getProjectQueue();
      setDemands(data);
    } catch {
      showToast('Erro ao carregar fila de projeto', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  const handleAction = async (
    demandId: number,
    newStatus: string,
    label: string
  ) => {
    setProcessing(demandId);
    try {
      await changeStatus(demandId, newStatus, observacoes[demandId]);
      showToast(`Demanda enviada para ${label}`, 'success');
      fetchQueue();
    } catch {
      showToast('Erro ao alterar status', 'error');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Inbox className="h-7 w-7 text-teal-600" />
          <h1 className="text-2xl font-bold text-gray-900">
            Fila de Decupagem
          </h1>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Demandas em projeto aguardando decupagem do projetista.
        </p>
      </div>

      {demands.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <Inbox className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Nenhuma demanda em projeto
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Quando demandas entrarem em projeto, elas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {demands.map((demand) => (
            <div key={demand.id} className="card">
              <div className="flex items-start justify-between">
                <div
                  className="flex-1 cursor-pointer"
                  onClick={() => setSelectedId(demand.id)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-gray-900">
                      {demand.titulo}
                    </h3>
                    <StatusBadge status={demand.status} />
                    <PriorityBadge priority={demand.prioridade} />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {demand.campaign?.cliente} -{' '}
                    {demand.campaign?.nome_campanha} | Categoria:{' '}
                    {demand.category?.nome || 'N/A'} | Criado em{' '}
                    {format(new Date(demand.created_at), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </p>
                  {demand.descricao && (
                    <p className="mt-2 line-clamp-2 text-sm text-gray-600">
                      {demand.descricao}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-gray-100 pt-4">
                <div className="mb-3">
                  <label className="mb-1 block text-xs text-gray-500">
                    Observação
                  </label>
                  <input
                    type="text"
                    value={observacoes[demand.id] || ''}
                    onChange={(e) =>
                      setObservacoes((prev) => ({
                        ...prev,
                        [demand.id]: e.target.value,
                      }))
                    }
                    placeholder="Observação (opcional)"
                    className="input-field text-sm"
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      handleAction(
                        demand.id,
                        DemandStatus.EM_DESENVOLVIMENTO,
                        'Desenvolvimento'
                      )
                    }
                    disabled={processing === demand.id}
                    className="btn-secondary text-xs"
                  >
                    <ArrowRight className="mr-1 h-3 w-3" />
                    Enviar para Desenvolvimento
                  </button>
                  <button
                    onClick={() =>
                      handleAction(
                        demand.id,
                        DemandStatus.PENDENCIA,
                        'Pendência'
                      )
                    }
                    disabled={processing === demand.id}
                    className="btn-danger text-xs"
                  >
                    <AlertCircle className="mr-1 h-3 w-3" />
                    Devolver como Pendência
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedId && (
        <DemandSlideOver
          demandId={selectedId}
          onClose={() => setSelectedId(null)}
          onStatusChange={fetchQueue}
        />
      )}
    </div>
  );
}
