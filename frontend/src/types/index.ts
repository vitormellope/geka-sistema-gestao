export const DemandStatus = {
  NOVA: 'nova',
  EM_TRIAGEM: 'em_triagem',
  PENDENCIA: 'pendencia',
  EM_PROJETO: 'em_projeto',
  EM_DESENVOLVIMENTO: 'em_desenvolvimento',
  ORCADO: 'orcado',
  PROPOSTA_ENVIADA: 'proposta_enviada',
  FECHADO: 'fechado',
} as const;

export type DemandStatusType = (typeof DemandStatus)[keyof typeof DemandStatus];

export const Priority = {
  BAIXA: 'baixa',
  MEDIA: 'media',
  ALTA: 'alta',
  URGENTE: 'urgente',
} as const;

export type PriorityType = (typeof Priority)[keyof typeof Priority];

export const UserRole = {
  VENDEDOR: 'vendedor',
  ORCAMENTISTA: 'orcamentista',
  PROJETISTA: 'projetista',
  GERENTE: 'gerente',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

export interface User {
  id: number;
  nome: string;
  email: string;
  role: UserRoleType;
  is_active: boolean;
}

export interface Category {
  id: number;
  nome: string;
  fields_schema: Record<string, unknown> | null;
}

export interface Campaign {
  id: number;
  cliente: string;
  nome_campanha: string;
  created_by: number;
  created_at: string;
}

export interface Demand {
  id: number;
  campaign_id: number;
  titulo: string;
  descricao: string | null;
  categoria_id: number | null;
  status: DemandStatusType;
  prioridade: PriorityType;
  prazo_esperado: string | null;
  prazo_orcamento_sla: string | null;
  valor_estimado: number | null;
  campos_dinamicos: Record<string, unknown> | null;
  created_by_id: number;
  assigned_to_id: number | null;
  created_at: string;
  updated_at: string;
  campaign?: Campaign;
  category?: Category;
  created_by?: User;
  assigned_to?: User;
  logs?: DemandLog[];
  attachments?: Attachment[];
}

export interface DemandLog {
  id: number;
  demand_id: number;
  user_id: number;
  acao: string;
  status_anterior: DemandStatusType | null;
  status_novo: DemandStatusType | null;
  observacao: string | null;
  timestamp: string;
  user?: User;
}

export interface Attachment {
  id: number;
  demand_id: number;
  filename: string;
  content_type: string;
  uploaded_at: string;
  uploaded_by?: User;
}

export interface Notification {
  id: number;
  message: string;
  demand_id: number | null;
  is_read: boolean;
  created_at: string;
}
