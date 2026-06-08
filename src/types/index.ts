export type Role = 'vendedor' | 'assistente' | 'orcamentista' | 'gerente' | 'projetista'
export type Status = 'nova' | 'em_triagem' | 'pendencia_informacao' | 'orcamento_direto' | 'projeto_decupagem' | 'orcado' | 'proposta_enviada' | 'fechado' | 'cancelada'
export type Priority = 'urgente' | 'alta' | 'normal'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  active: boolean
}

export interface CategoryField {
  name: string
  label: string
  type: 'text' | 'number' | 'select' | 'boolean' | 'textarea' | 'date'
  required: boolean
  options?: string[]
}

export interface Category {
  id: number
  name: string
  fields_schema: CategoryField[]
}

export interface HistoryEntry {
  id: number
  timestamp: string
  user_id: number
  user_name: string
  prev_status: Status | null
  new_status: Status
  observation: string | null
}

export interface AttachmentData {
  id: number
  demand_id: number
  filename: string
  file_type: string
  file_size: number
  uploaded_at: string
  uploaded_by: number
  uploaded_by_name?: string
}

export interface Campaign {
  id: number
  name: string
  description: string | null
  client: string
  seller_id: number
  seller_name: string
  status: string
  demands_count: number
  created_at: string
  updated_at: string
}

export interface Demand {
  id: number
  title: string
  seller_id: number
  seller_name: string
  assistant_id: number | null
  assistant_name: string | null
  client: string
  category_id: number
  category_name: string
  deadline: string | null
  sla_date: string | null
  campaign_id: number | null
  status: Status
  priority: Priority
  estimated_value: number | null
  created_at: string
  updated_at: string
  attachments_count?: number
  field_values?: Record<string, string>
  history?: HistoryEntry[]
  attachments?: AttachmentData[]
}

export interface Notification {
  id: number
  demand_id: number | null
  message: string
  read: boolean
  created_at: string
}
