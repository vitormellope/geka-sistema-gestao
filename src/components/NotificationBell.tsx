'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Notification } from '@/types'

export function NotificationBell() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const data = await res.json()
        setNotifications(data)
        setUnreadCount(data.filter((n: Notification) => !n.read).length)
      }
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const markAsRead = async (id: number) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PUT' })
    fetchNotifications()
  }

  const markAllRead = async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT' })
    fetchNotifications()
  }

  const handleClick = (n: Notification) => {
    if (!n.read) markAsRead(n.id)
    if (n.demand_id) {
      router.push(`/demands/${n.demand_id}`)
      setOpen(false)
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 text-slate-500 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-200 z-50 max-h-96 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900">Notificações</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="overflow-y-auto flex-1">
            {notifications.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-8">Nenhuma notificação</p>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 ${
                    !n.read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="w-2 h-2 bg-blue-500 rounded-full mt-1.5 flex-shrink-0" />}
                    <div className="min-w-0">
                      <p className={`text-sm ${!n.read ? 'font-medium text-slate-900' : 'text-slate-600'}`}>
                        {n.message}
                      </p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
