import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(user) {
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    if (!user) return
    fetchNotifications()
  }, [user])

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      const notifs = data ?? []
      setNotifications(notifs)
      setUnreadCount(notifs.filter(n => !n.read).length)
    } catch (err) {
      console.error('Notifications fetch error:', err)
    }
  }

  const markRead = useCallback(async (id) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id)
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
    setUnreadCount(prev => Math.max(0, prev - 1))
  }, [])

  const markAllRead = useCallback(async () => {
    if (!user) return
    await supabase.from('notifications').update({ read: true })
      .eq('user_id', user.id).eq('read', false)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    setUnreadCount(0)
  }, [user])

  return { notifications, unreadCount, markRead, markAllRead, refetch: fetchNotifications }
}
