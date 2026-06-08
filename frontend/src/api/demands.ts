import client from './client';
import type { Demand } from '@/types';

export async function listDemands(params?: Record<string, string>) {
  const response = await client.get<Demand[]>('/demands', { params });
  return response.data;
}

export async function getDemand(id: number) {
  const response = await client.get<Demand>(`/demands/${id}`);
  return response.data;
}

export async function createDemand(data: Partial<Demand>) {
  const response = await client.post<Demand>('/demands', data);
  return response.data;
}

export async function updateDemand(id: number, data: Partial<Demand>) {
  const response = await client.put<Demand>(`/demands/${id}`, data);
  return response.data;
}

export async function changeStatus(
  id: number,
  status: string,
  observacao?: string,
  prazoOrcamentoSla?: string
) {
  const response = await client.put(`/demands/${id}/status`, {
    novo_status: status,
    observacao,
    prazo_orcamento_sla: prazoOrcamentoSla,
  });
  return response.data;
}

export async function getTriageQueue() {
  const response = await client.get<Demand[]>('/demands/queue/triage');
  return response.data;
}

export async function getProjectQueue() {
  const response = await client.get<Demand[]>('/demands/queue/project');
  return response.data;
}

export async function getKanban() {
  const response = await client.get<Record<string, Demand[]>>('/demands/kanban');
  return response.data;
}

export async function uploadAttachment(demandId: number, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  const response = await client.post(`/demands/${demandId}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
}

export async function downloadAttachment(attachmentId: number) {
  const response = await client.get(`/attachments/${attachmentId}/download`, {
    responseType: 'blob',
  });
  return response.data;
}
