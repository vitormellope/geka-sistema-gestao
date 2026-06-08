import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { listCampaigns, createCampaign } from '@/api/campaigns';
import { listDemands } from '@/api/demands';
import type { Campaign, Demand, DemandStatusType } from '@/types';
import StatusBadge from '@/components/StatusBadge';
import PriorityBadge from '@/components/PriorityBadge';
import DemandSlideOver from '@/components/DemandSlideOver';
import Spinner from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { Megaphone, Plus, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [cliente, setCliente] = useState('');
  const [nomeCampanha, setNomeCampanha] = useState('');
  const [creating, setCreating] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [campaignDemands, setCampaignDemands] = useState<Demand[]>([]);
  const [loadingDemands, setLoadingDemands] = useState(false);
  const [selectedDemandId, setSelectedDemandId] = useState<number | null>(null);

  const fetchCampaigns = useCallback(async () => {
    try {
      const data = await listCampaigns();
      setCampaigns(data);
    } catch {
      showToast('Erro ao carregar campanhas', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
  }, [fetchCampaigns]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await createCampaign({ cliente, nome_campanha: nomeCampanha });
      showToast('Campanha criada com sucesso!', 'success');
      setCliente('');
      setNomeCampanha('');
      setShowForm(false);
      fetchCampaigns();
    } catch {
      showToast('Erro ao criar campanha', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleExpand = async (campaignId: number) => {
    if (expandedId === campaignId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(campaignId);
    setLoadingDemands(true);
    try {
      const data = await listDemands({ campaign_id: String(campaignId) });
      setCampaignDemands(data);
    } catch {
      setCampaignDemands([]);
    } finally {
      setLoadingDemands(false);
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Megaphone className="h-7 w-7 text-teal-600" />
            <h1 className="text-2xl font-bold text-gray-900">Campanhas</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Gerencie campanhas e seus projetos.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn-primary"
        >
          <Plus className="mr-1 h-4 w-4" />
          Nova Campanha
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="card mb-6">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Criar Campanha
          </h3>
          <form onSubmit={handleCreate} className="flex gap-3">
            <input
              type="text"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              placeholder="Nome do cliente"
              className="input-field flex-1"
              required
            />
            <input
              type="text"
              value={nomeCampanha}
              onChange={(e) => setNomeCampanha(e.target.value)}
              placeholder="Nome da campanha"
              className="input-field flex-1"
              required
            />
            <button
              type="submit"
              disabled={creating}
              className="btn-primary"
            >
              {creating ? <Spinner size="sm" /> : 'Criar'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="btn-secondary"
            >
              Cancelar
            </button>
          </form>
        </div>
      )}

      {/* Campaign list */}
      {campaigns.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-12">
          <Megaphone className="mb-3 h-12 w-12 text-gray-300" />
          <p className="text-sm font-medium text-gray-500">
            Nenhuma campanha encontrada
          </p>
          <p className="mt-1 text-xs text-gray-400">
            Crie a primeira campanha para começar.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map((camp) => (
            <div key={camp.id} className="card p-0">
              <button
                onClick={() => handleExpand(camp.id)}
                className="flex w-full items-center justify-between px-6 py-4 text-left"
              >
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">
                    {camp.cliente}
                  </h3>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {camp.nome_campanha}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-400">
                    {format(new Date(camp.created_at), 'dd/MM/yyyy', {
                      locale: ptBR,
                    })}
                  </span>
                  {expandedId === camp.id ? (
                    <ChevronDown className="h-5 w-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  )}
                </div>
              </button>

              {expandedId === camp.id && (
                <div className="border-t border-gray-100 px-6 py-4">
                  {loadingDemands ? (
                    <Spinner size="sm" className="py-4" />
                  ) : campaignDemands.length === 0 ? (
                    <p className="py-4 text-center text-sm text-gray-400">
                      Nenhuma demanda nesta campanha
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {campaignDemands.map((d) => (
                        <div
                          key={d.id}
                          onClick={() => setSelectedDemandId(d.id)}
                          className="flex cursor-pointer items-center justify-between rounded-lg bg-gray-50 px-3 py-2 transition-colors hover:bg-gray-100"
                        >
                          <span className="text-sm font-medium text-gray-900">
                            {d.titulo}
                          </span>
                          <div className="flex items-center gap-2">
                            <StatusBadge
                              status={d.status as DemandStatusType}
                            />
                            <PriorityBadge priority={d.prioridade} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedDemandId && (
        <DemandSlideOver
          demandId={selectedDemandId}
          onClose={() => setSelectedDemandId(null)}
        />
      )}
    </div>
  );
}
