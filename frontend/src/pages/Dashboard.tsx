import { useState, useEffect, useCallback } from 'react';
import {
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle,
  Search,
} from 'lucide-react';
import { listDemands } from '@/api/demands';
import type { Demand, DemandStatusType } from '@/types';
import { DemandStatus } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import DemandSlideOver from '@/components/DemandSlideOver';
import Spinner from '@/components/Spinner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Dashboard() {
  const { user } = useAuth();
  const [demands, setDemands] = useState<Demand[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null);

  const fetchDemands = useCallback(async () => {
    try {
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const data = await listDemands(params);
      setDemands(data);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [statusFilter, search]);

  useEffect(() => {
    fetchDemands();
  }, [fetchDemands]);

  const stats = {
    total: demands.length,
    pendentes: demands.filter(
      (d) =>
        d.status === DemandStatus.NOVA ||
        d.status === DemandStatus.EM_TRIAGEM ||
        d.status === DemandStatus.PENDENCIA
    ).length,
    emAndamento: demands.filter(
      (d) =>
        d.status === DemandStatus.EM_PROJETO ||
        d.status === DemandStatus.EM_DESENVOLVIMENTO
    ).length,
    concluidas: demands.filter(
      (d) =>
        d.status === DemandStatus.ORCADO ||
        d.status === DemandStatus.PROPOSTA_ENVIADA ||
        d.status === DemandStatus.FECHADO
    ).length,
  };

  const statusOptions: { value: string; label: string }[] = [
    { value: '', label: 'Todos os Status' },
    { value: DemandStatus.NOVA, label: 'Nova' },
    { value: DemandStatus.EM_TRIAGEM, label: 'Em Triagem' },
    { value: DemandStatus.PENDENCIA, label: 'Pendência' },
    { value: DemandStatus.EM_PROJETO, label: 'Em Projeto' },
    { value: DemandStatus.EM_DESENVOLVIMENTO, label: 'Em Desenvolvimento' },
    { value: DemandStatus.ORCADO, label: 'Orçado' },
    { value: DemandStatus.PROPOSTA_ENVIADA, label: 'Proposta Enviada' },
    { value: DemandStatus.FECHADO, label: 'Fechado' },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Bem-vindo, {user?.nome}. Aqui está o resumo das suas demandas.
        </p>
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-blue-100 p-3">
            <FileText className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            <p className="text-sm text-gray-500">Total de Demandas</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-yellow-100 p-3">
            <Clock className="h-6 w-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.pendentes}
            </p>
            <p className="text-sm text-gray-500">Pendentes</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-purple-100 p-3">
            <AlertTriangle className="h-6 w-6 text-purple-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.emAndamento}
            </p>
            <p className="text-sm text-gray-500">Em Andamento</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="rounded-lg bg-green-100 p-3">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.concluidas}
            </p>
            <p className="text-sm text-gray-500">Concluídas</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por título..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field w-full sm:w-52"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Demands table */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <Spinner />
        </div>
      ) : demands.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <FileText className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Nenhuma demanda encontrada
          </p>
          <p className="mt-1 text-xs text-gray-400">
            As demandas aparecerão aqui quando forem criadas.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Título
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Cliente
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Categoria
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Prioridade
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Data
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Atribuído
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {demands.map((demand) => (
                  <tr
                    key={demand.id}
                    onClick={() => setSelectedDemandId(demand.id)}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {demand.titulo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {demand.campaign?.cliente || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {demand.category?.nome || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        status={demand.status as DemandStatusType}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <PriorityBadge priority={demand.prioridade} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {format(new Date(demand.created_at), 'dd/MM/yyyy', {
                        locale: ptBR,
                      })}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {demand.assigned_to?.nome || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Slide-over */}
      {selectedDemandId && (
        <DemandSlideOver
          demandId={selectedDemandId}
          onClose={() => setSelectedDemandId(null)}
          onStatusChange={fetchDemands}
        />
      )}
    </div>
  );
}
