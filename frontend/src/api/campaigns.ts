import client from './client';
import type { Campaign } from '@/types';

export async function listCampaigns() {
  const response = await client.get<Campaign[]>('/campaigns');
  return response.data;
}

export async function getCampaign(id: number) {
  const response = await client.get<Campaign>(`/campaigns/${id}`);
  return response.data;
}

export async function createCampaign(data: { cliente: string; nome_campanha: string }) {
  const response = await client.post<Campaign>('/campaigns', data);
  return response.data;
}

export async function updateCampaign(id: number, data: { cliente?: string; nome_campanha?: string }) {
  const response = await client.put<Campaign>(`/campaigns/${id}`, data);
  return response.data;
}
