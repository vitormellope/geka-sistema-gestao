import client from './client';
import type { User } from '@/types';

export async function listUsers() {
  const response = await client.get<User[]>('/users');
  return response.data;
}

export async function getUser(id: number) {
  const response = await client.get<User>(`/users/${id}`);
  return response.data;
}

export async function createUser(data: {
  nome: string;
  email: string;
  password: string;
  role: string;
}) {
  const response = await client.post<User>('/users', data);
  return response.data;
}

export async function updateUser(
  id: number,
  data: { nome?: string; email?: string; role?: string; is_active?: boolean; password?: string }
) {
  const response = await client.put<User>(`/users/${id}`, data);
  return response.data;
}

export async function getSellers() {
  const response = await client.get<User[]>('/users/sellers');
  return response.data;
}
