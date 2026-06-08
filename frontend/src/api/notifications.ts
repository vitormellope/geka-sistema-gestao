import client from './client';
import type { Notification } from '@/types';

export async function listNotifications() {
  const response = await client.get<Notification[]>('/notifications');
  return response.data;
}

export async function markRead(id: number) {
  const response = await client.patch(`/notifications/${id}/read`);
  return response.data;
}

export async function markAllRead() {
  const response = await client.patch('/notifications/read-all');
  return response.data;
}

export async function getUnreadCount() {
  const notifications = await listNotifications();
  return notifications.filter((n) => !n.is_read).length;
}
