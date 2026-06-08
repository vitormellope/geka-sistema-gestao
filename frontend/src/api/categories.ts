import client from './client';
import type { Category } from '@/types';

export async function listCategories() {
  const response = await client.get<Category[]>('/categories');
  return response.data;
}

export async function createCategory(data: { nome: string; fields_schema?: Record<string, unknown> }) {
  const response = await client.post<Category>('/categories', data);
  return response.data;
}

export async function updateCategory(id: number, data: { nome?: string; fields_schema?: Record<string, unknown> }) {
  const response = await client.put<Category>(`/categories/${id}`, data);
  return response.data;
}

export async function deleteCategory(id: number) {
  await client.delete(`/categories/${id}`);
}
