'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import type { Category, CategoryField, Campaign, User } from '@/types'
import { PageSpinner } from '@/components/Spinner'
import toast from 'react-hot-toast'

export default function NewDemandPage() {
  const { data: session, status: authStatus } = useSession()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [sellers, setSellers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Form fields
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [deadline, setDeadline] = useState('')
  const [campaignId, setCampaignId] = useState('')
  const [assistantId, setAssistantId] = useState('')
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})

  // Dynamic fields from selected category
  const [dynamicFields, setDynamicFields] = useState<CategoryField[]>([])

  const loadInitialData = useCallback(async () => {
    try {
      const [catRes, campRes, sellRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/campaigns'),
        fetch('/api/users/sellers'),
      ])
      if (catRes.ok) setCategories(await catRes.json())
      if (campRes.ok) setCampaigns(await campRes.json())
      if (sellRes.ok) setSellers(await sellRes.json())
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authStatus === 'authenticated') loadInitialData()
  }, [authStatus, loadInitialData])

  // When category changes, load its fields schema
  useEffect(() => {
    if (!categoryId) {
      setDynamicFields([])
      setFieldValues({})
      return
    }
    const cat = categories.find((c) => c.id === Number(categoryId))
    if (cat && cat.fields_schema) {
      setDynamicFields(cat.fields_schema)
      // Initialize field values
      const initial: Record<string, string> = {}
      cat.fields_schema.forEach((f) => {
        initial[f.name] = ''
      })
      setFieldValues(initial)
    } else {
      setDynamicFields([])
      setFieldValues({})
    }
  }, [categoryId, categories])

  const handleFieldChange = (fieldName: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!title.trim() || !client.trim() || !categoryId) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    // Validate required dynamic fields
    for (const field of dynamicFields) {
      if (field.required && !fieldValues[field.name]?.trim()) {
        toast.error(`Campo "${field.label}" é obrigatório`)
        return
      }
    }

    setSubmitting(true)

    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        client: client.trim(),
        category_id: Number(categoryId),
        field_values: fieldValues,
      }

      if (deadline) body.deadline = deadline
      if (campaignId) body.campaign_id = Number(campaignId)
      if (assistantId) body.assistant_id = Number(assistantId)

      const res = await fetch('/api/demands', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (res.ok) {
        const data = await res.json()
        toast.success('Demanda criada com sucesso!')
        router.push(`/demands/${data.id}`)
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Erro ao criar demanda')
      }
    } catch {
      toast.error('Erro ao criar demanda')
    } finally {
      setSubmitting(false)
    }
  }

  if (authStatus === 'loading' || loading) return <PageSpinner />

  const renderDynamicField = (field: CategoryField) => {
    const value = fieldValues[field.name] || ''
    const baseClasses =
      'w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500'

    switch (field.type) {
      case 'text':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClasses}
          />
        )
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClasses}
          />
        )
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClasses}
          >
            <option value="">Selecione...</option>
            {field.options?.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        )
      case 'boolean':
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === 'true'}
              onChange={(e) => handleFieldChange(field.name, e.target.checked ? 'true' : 'false')}
              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-600">Sim</span>
          </label>
        )
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            rows={3}
            className={baseClasses}
          />
        )
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClasses}
          />
        )
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.name, e.target.value)}
            className={baseClasses}
          />
        )
    }
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Nova Demanda</h1>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Titulo <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Ex: Banner promocional Black Friday"
          />
        </div>

        {/* Client */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Cliente <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={client}
            onChange={(e) => setClient(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Nome do cliente"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">
            Categoria <span className="text-red-500">*</span>
          </label>
          <select
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecione uma categoria</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic Fields */}
        {dynamicFields.length > 0 && (
          <div className="border-t border-slate-200 pt-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Campos da Categoria</h3>
            <div className="space-y-4">
              {dynamicFields.map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  {renderDynamicField(field)}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deadline */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Prazo</label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        {/* Campaign */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Campanha (opcional)</label>
          <select
            value={campaignId}
            onChange={(e) => setCampaignId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Nenhuma campanha</option>
            {campaigns.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} - {c.client}
              </option>
            ))}
          </select>
        </div>

        {/* Assistant */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Assistente (opcional)</label>
          <select
            value={assistantId}
            onChange={(e) => setAssistantId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Nenhum assistente</option>
            {sellers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium disabled:opacity-50"
          >
            {submitting ? 'Criando...' : 'Criar Demanda'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
