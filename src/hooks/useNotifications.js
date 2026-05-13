import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useNotifications(userOrId) {
  const [notifications, setNotifications] = useState([])
  const userId = userOrId?.id ?? userOrId

  const fetchNotifications = useCallback(async () => {
    if (!userId || typeof userId !== 'string') return
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(10)

    if (!error && data) {
      setNotifications(data)
    }
  }, [userId])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  async function markRead(id) {
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    setNotifications(prev => prev.filter(n => n.id !== id))
  }

  async function markAllRead() {
    if (!userId || typeof userId !== 'string') return
    await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
    setNotifications([])
  }

  return { notifications, markRead, markAllRead, refetch: fetchNotifications }
}
