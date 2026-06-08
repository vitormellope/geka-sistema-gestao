import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDemand, uploadAttachment } from '@/api/demands';
import { listCampaigns, createCampaign } from '@/api/campaigns';
import { listCategories } from '@/api/categories';
import type { Campaign, Category } from '@/types';
import { Priority } from '@/types';
import Spinner from '@/components/Spinner';
import { showToast } from '@/components/Toast';
import { PlusCircle, Upload, X } from 'lucide-react';

export default function NewDemand() {
  const navigate = useNavigate();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [campaignId, setCampaignId] = useState<number | ''>('');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [newCliente, setNewCliente] = useState('');
  const [newCampanha, setNewCampanha] = useState('');
  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [categoriaId, setCategoriaId] = useState<number | ''>('');
  const [prioridade, setPrioridade] = useState(Priority.MEDIA);
  const [prazoEsperado, setPrazoEsperado] = useState('');
  const [camposDinamicos, setCamposDinamicos] = useState<
    Record<string, string>
  >({});
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    Promise.all([listCampaigns(), listCategories()])
      .then(([camps, cats]) => {
        setCampaigns(camps);
        setCategories(cats);
      })
      .catch(() => showToast('Erro ao carregar dados', 'error'))
      .finally(() => setLoading(false));
  }, []);

  const selectedCategory = categories.find((c) => c.id === categoriaId);
  const dynamicFields =
    selectedCategory?.fields_schema &&
    typeof selectedCategory.fields_schema === 'object'
      ? Object.entries(selectedCategory.fields_schema as Record<string, string>)
      : [];

  const handleCategoryChange = (id: number | '') => {
    setCategoriaId(id);
    setCamposDinamicos({});
  };

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const handleFileRemove = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      let finalCampaignId = campaignId;

      // Create campaign if needed
      if (showNewCampaign && newCliente && newCampanha) {
        const newCamp = await createCampaign({
          cliente: newCliente,
          nome_campanha: newCampanha,
        });
        finalCampaignId = newCamp.id;
      }

      if (!finalCampaignId) {
        showToast('Selecione ou crie uma campanha', 'error');
        setSubmitting(false);
        return;
      }

      const demand = await createDemand({
        campaign_id: finalCampaignId as number,
        titulo,
        descricao: descricao || null,
        categoria_id: categoriaId || null,
        prioridade,
        prazo_esperado: prazoEsperado || null,
        campos_dinamicos:
          Object.keys(camposDinamicos).length > 0 ? camposDinamicos : null,
      });

      // Upload attachments
      for (const file of files) {
        await uploadAttachment(demand.id, file);
      }

      showToast('Demanda criada com sucesso!', 'success');
      navigate('/');
    } catch {
      showToast('Erro ao criar demanda', 'error');
    } finally {
      setSubmitting(false);
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
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Nova Demanda</h1>
        <p className="mt-1 text-sm text-gray-500">
          Preencha os dados abaixo para criar uma nova demanda.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Campaign */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">
            Campanha
          </h3>

          {!showNewCampaign ? (
            <div className="space-y-3">
              <select
                value={campaignId}
                onChange={(e) =>
                  setCampaignId(e.target.value ? Number(e.target.value) : '')
                }
                className="input-field"
                required={!showNewCampaign}
              >
                <option value="">Selecione uma campanha</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cliente} - {c.nome_campanha}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setShowNewCampaign(true)}
                className="flex items-center gap-1 text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                <PlusCircle className="h-4 w-4" />
                Criar nova campanha
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={newCliente}
                    onChange={(e) => setNewCliente(e.target.value)}
                    placeholder="Nome do cliente"
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm text-gray-600">
                    Nome da Campanha
                  </label>
                  <input
                    type="text"
                    value={newCampanha}
                    onChange={(e) => setNewCampanha(e.target.value)}
                    placeholder="Nome da campanha"
                    className="input-field"
                    required
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowNewCampaign(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Selecionar campanha existente
              </button>
            </div>
          )}
        </div>

        {/* Demand details */}
        <div className="card space-y-4">
          <h3 className="text-sm font-semibold text-gray-700">
            Dados da Demanda
          </h3>

          <div>
            <label className="mb-1 block text-sm text-gray-600">
              Título *
            </label>
            <input
              type="text"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Título da demanda"
              className="input-field"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">
              Descrição
            </label>
            <textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição detalhada"
              className="input-field"
              rows={4}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Categoria
              </label>
              <select
                value={categoriaId}
                onChange={(e) =>
                  handleCategoryChange(
                    e.target.value ? Number(e.target.value) : ''
                  )
                }
                className="input-field"
              >
                <option value="">Selecione</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-gray-600">
                Prioridade
              </label>
              <select
                value={prioridade}
                onChange={(e) => setPrioridade(e.target.value as typeof prioridade)}
                className="input-field"
              >
                <option value={Priority.BAIXA}>Baixa</option>
                <option value={Priority.MEDIA}>Média</option>
                <option value={Priority.ALTA}>Alta</option>
                <option value={Priority.URGENTE}>Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm text-gray-600">
              Prazo Esperado
            </label>
            <input
              type="date"
              value={prazoEsperado}
              onChange={(e) => setPrazoEsperado(e.target.value)}
              className="input-field"
            />
          </div>
        </div>

        {/* Dynamic fields */}
        {dynamicFields.length > 0 && (
          <div className="card space-y-4">
            <h3 className="text-sm font-semibold text-gray-700">
              Campos de {selectedCategory?.nome}
            </h3>
            {dynamicFields.map(([key, fieldType]) => (
              <div key={key}>
                <label className="mb-1 block text-sm capitalize text-gray-600">
                  {key.replace(/_/g, ' ')}
                </label>
                <input
                  type={fieldType === 'number' ? 'number' : 'text'}
                  value={camposDinamicos[key] || ''}
                  onChange={(e) =>
                    setCamposDinamicos((prev) => ({
                      ...prev,
                      [key]: e.target.value,
                    }))
                  }
                  placeholder={key.replace(/_/g, ' ')}
                  className="input-field"
                />
              </div>
            ))}
          </div>
        )}

        {/* Attachments */}
        <div className="card">
          <h3 className="mb-4 text-sm font-semibold text-gray-700">Anexos</h3>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-sm text-gray-500 transition-colors hover:border-teal-400 hover:text-teal-600">
            <Upload className="h-5 w-5" />
            Clique para adicionar arquivos
            <input
              type="file"
              multiple
              onChange={handleFileAdd}
              className="hidden"
            />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                >
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    type="button"
                    onClick={() => handleFileRemove(i)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? <Spinner size="sm" /> : 'Criar Demanda'}
          </button>
        </div>
      </form>
    </div>
  );
}
