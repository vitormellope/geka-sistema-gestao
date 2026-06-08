import { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  FileText,
  Download,
  Clock,
  DollarSign,
} from 'lucide-react';
import { getDemand, changeStatus, downloadAttachment } from '@/api/demands';
import type { Demand, DemandStatusType } from '@/types';
import { DemandStatus, UserRole } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from './StatusBadge';
import PriorityBadge from './PriorityBadge';
import Spinner from './Spinner';
import { showToast } from './Toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface DemandSlideOverProps {
  demandId: number | null;
  onClose: () => void;
  onStatusChange?: () => void;
}

const roleTransitions: Record<string, Record<string, string[]>> = {
  [UserRole.VENDEDOR]: {
    [DemandStatus.PENDENCIA]: [DemandStatus.EM_TRIAGEM],
    [DemandStatus.ORCADO]: [DemandStatus.PROPOSTA_ENVIADA],
    [DemandStatus.PROPOSTA_ENVIADA]: [DemandStatus.FECHADO],
  },
  [UserRole.ORCAMENTISTA]: {
    [DemandStatus.EM_TRIAGEM]: [
      DemandStatus.EM_PROJETO,
      DemandStatus.EM_DESENVOLVIMENTO,
      DemandStatus.PENDENCIA,
    ],
    [DemandStatus.EM_DESENVOLVIMENTO]: [DemandStatus.ORCADO, DemandStatus.PENDENCIA],
  },
  [UserRole.PROJETISTA]: {
    [DemandStatus.EM_PROJETO]: [
      DemandStatus.EM_DESENVOLVIMENTO,
      DemandStatus.PENDENCIA,
    ],
  },
  [UserRole.GERENTE]: {
    [DemandStatus.NOVA]: [DemandStatus.EM_TRIAGEM],
    [DemandStatus.EM_TRIAGEM]: [
      DemandStatus.EM_PROJETO,
      DemandStatus.EM_DESENVOLVIMENTO,
      DemandStatus.PENDENCIA,
    ],
    [DemandStatus.PENDENCIA]: [DemandStatus.EM_TRIAGEM],
    [DemandStatus.EM_PROJETO]: [
      DemandStatus.EM_DESENVOLVIMENTO,
      DemandStatus.PENDENCIA,
    ],
    [DemandStatus.EM_DESENVOLVIMENTO]: [DemandStatus.ORCADO, DemandStatus.PENDENCIA],
    [DemandStatus.ORCADO]: [DemandStatus.PROPOSTA_ENVIADA],
    [DemandStatus.PROPOSTA_ENVIADA]: [DemandStatus.FECHADO],
  },
};

const statusLabels: Record<string, string> = {
  nova: 'Nova',
  em_triagem: 'Em Triagem',
  pendencia: 'Pendência',
  em_projeto: 'Em Projeto',
  em_desenvolvimento: 'Em Desenvolvimento',
  orcado: 'Orçado',
  proposta_enviada: 'Proposta Enviada',
  fechado: 'Fechado',
};

export default function DemandSlideOver({
  demandId,
  onClose,
  onStatusChange,
}: DemandSlideOverProps) {
  const { user } = useAuth();
  const [demand, setDemand] = useState<Demand | null>(null);
  const [loading, setLoading] = useState(true);
  const [observacao, setObservacao] = useState('');
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (demandId) {
      setLoading(true);
      getDemand(demandId)
        .then(setDemand)
        .catch(() => showToast('Erro ao carregar demanda', 'error'))
        .finally(() => setLoading(false));
    }
  }, [demandId]);

  if (!demandId) return null;

  const allowedTransitions =
    user && demand
      ? roleTransitions[user.role]?.[demand.status] || []
      : [];

  const handleStatusChange = async (newStatus: DemandStatusType) => {
    if (!demand) return;
    setChangingStatus(true);
    try {
      await changeStatus(demand.id, newStatus, observacao || undefined);
      showToast(
        `Status alterado para ${statusLabels[newStatus]}`,
        'success'
      );
      setObservacao('');
      const updated = await getDemand(demand.id);
      setDemand(updated);
      onStatusChange?.();
    } catch {
      showToast('Erro ao alterar status', 'error');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDownload = async (attachmentId: number, filename: string) => {
    try {
      const blob = await downloadAttachment(attachmentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      showToast('Erro ao baixar arquivo', 'error');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="slide-over-enter fixed inset-y-0 right-0 z-50 w-full max-w-xl overflow-y-auto bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Detalhes da Demanda
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <Spinner />
          </div>
        ) : !demand ? (
          <div className="p-6 text-center text-gray-500">
            Demanda não encontrada
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Header */}
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {demand.titulo}
              </h3>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge status={demand.status} />
                <PriorityBadge priority={demand.prioridade} />
              </div>
            </div>

            {/* Details grid */}
            <div className="grid grid-cols-2 gap-4">
              {demand.campaign && (
                <div className="flex items-start gap-2">
                  <Tag className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Campanha</p>
                    <p className="text-sm font-medium text-gray-900">
                      {demand.campaign.cliente} - {demand.campaign.nome_campanha}
                    </p>
                  </div>
                </div>
              )}
              {demand.category && (
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Categoria</p>
                    <p className="text-sm font-medium text-gray-900">
                      {demand.category.nome}
                    </p>
                  </div>
                </div>
              )}
              {demand.created_by && (
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Criado por</p>
                    <p className="text-sm font-medium text-gray-900">
                      {demand.created_by.nome}
                    </p>
                  </div>
                </div>
              )}
              {demand.assigned_to && (
                <div className="flex items-start gap-2">
                  <User className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Atribuído a</p>
                    <p className="text-sm font-medium text-gray-900">
                      {demand.assigned_to.nome}
                    </p>
                  </div>
                </div>
              )}
              {demand.prazo_esperado && (
                <div className="flex items-start gap-2">
                  <Calendar className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Prazo Esperado</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(new Date(demand.prazo_esperado), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                </div>
              )}
              {demand.prazo_orcamento_sla && (
                <div className="flex items-start gap-2">
                  <Clock className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Prazo SLA</p>
                    <p className="text-sm font-medium text-gray-900">
                      {format(
                        new Date(demand.prazo_orcamento_sla),
                        'dd/MM/yyyy',
                        { locale: ptBR }
                      )}
                    </p>
                  </div>
                </div>
              )}
              {demand.valor_estimado != null && (
                <div className="flex items-start gap-2">
                  <DollarSign className="mt-0.5 h-4 w-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Valor Estimado</p>
                    <p className="text-sm font-medium text-gray-900">
                      R${' '}
                      {demand.valor_estimado.toLocaleString('pt-BR', {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              )}
              <div className="flex items-start gap-2">
                <Calendar className="mt-0.5 h-4 w-4 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Criado em</p>
                  <p className="text-sm font-medium text-gray-900">
                    {format(new Date(demand.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Description */}
            {demand.descricao && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Descrição
                </h4>
                <p className="whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  {demand.descricao}
                </p>
              </div>
            )}

            {/* Dynamic fields */}
            {demand.campos_dinamicos &&
              Object.keys(demand.campos_dinamicos).length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold text-gray-700">
                    Campos Adicionais
                  </h4>
                  <div className="rounded-lg bg-gray-50 p-3">
                    {Object.entries(demand.campos_dinamicos).map(
                      ([key, value]) => (
                        <div key={key} className="flex justify-between py-1">
                          <span className="text-sm capitalize text-gray-500">
                            {key.replace(/_/g, ' ')}
                          </span>
                          <span className="text-sm font-medium text-gray-900">
                            {String(value)}
                          </span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

            {/* Attachments */}
            {demand.attachments && demand.attachments.length > 0 && (
              <div>
                <h4 className="mb-2 text-sm font-semibold text-gray-700">
                  Anexos
                </h4>
                <div className="space-y-2">
                  {demand.attachments.map((att) => (
                    <div
                      key={att.id}
                      className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-700">
                          {att.filename}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDownload(att.id, att.filename)}
                        className="text-teal-600 hover:text-teal-700"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Status change actions */}
            {allowedTransitions.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                  Alterar Status
                </h4>
                <textarea
                  value={observacao}
                  onChange={(e) => setObservacao(e.target.value)}
                  placeholder="Observação (opcional)"
                  className="input-field mb-3"
                  rows={2}
                />
                <div className="flex flex-wrap gap-2">
                  {allowedTransitions.map((status) => (
                    <button
                      key={status}
                      onClick={() =>
                        handleStatusChange(status as DemandStatusType)
                      }
                      disabled={changingStatus}
                      className="btn-secondary text-xs"
                    >
                      {statusLabels[status] || status}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline / Logs */}
            {demand.logs && demand.logs.length > 0 && (
              <div className="border-t border-gray-200 pt-4">
                <h4 className="mb-3 text-sm font-semibold text-gray-700">
                  Histórico
                </h4>
                <div className="space-y-3">
                  {demand.logs
                    .slice()
                    .reverse()
                    .map((log) => (
                      <div
                        key={log.id}
                        className="relative border-l-2 border-gray-200 pl-4"
                      >
                        <div className="absolute -left-1.5 top-1 h-3 w-3 rounded-full border-2 border-white bg-teal-500" />
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">
                            {log.user?.nome || 'Sistema'}
                          </span>{' '}
                          - {log.acao}
                        </p>
                        {log.status_anterior && log.status_novo && (
                          <p className="text-xs text-gray-500">
                            {statusLabels[log.status_anterior] ||
                              log.status_anterior}{' '}
                            &rarr;{' '}
                            {statusLabels[log.status_novo] || log.status_novo}
                          </p>
                        )}
                        {log.observacao && (
                          <p className="mt-1 text-xs italic text-gray-500">
                            "{log.observacao}"
                          </p>
                        )}
                        <p className="mt-1 text-xs text-gray-400">
                          {format(
                            new Date(log.timestamp),
                            "dd/MM/yyyy 'às' HH:mm",
                            { locale: ptBR }
                          )}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
