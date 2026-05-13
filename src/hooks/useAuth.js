import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const tokenCache = useRef(null)

  useEffect(() => {
    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)

        if (session?.user) {
          // getUser() always returns full user with metadata
          const { data: { user: fullUser } } = await supabase.auth.getUser()
          setUser(fullUser ?? session.user)
          fetchProfile(fullUser?.id ?? session.user.id)
        } else {
          setUser(null)
          setProfile(null)
        }

        if (event === 'SIGNED_IN' && session?.provider_token) {
          tokenCache.current = {
            token: session.provider_token,
            expiry: session.expires_at
              ? session.expires_at * 1000
              : Date.now() + 3500 * 1000,
          }
          await storeGmailToken(session)
        }

        if (event === 'SIGNED_OUT') {
          tokenCache.current = null
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const initAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)

      if (session?.user) {
        // Always call getUser() for fresh metadata
        const { data: { user: fullUser } } = await supabase.auth.getUser()
        const activeUser = fullUser ?? session.user
        setUser(activeUser)
        await fetchProfile(activeUser.id)

        // Restore token cache if session has provider_token
        if (session.provider_token) {
          tokenCache.current = {
            token: session.provider_token,
            expiry: (session.expires_at ?? 0) * 1000,
          }
        }
      }
    } catch (err) {
      console.error('Auth init error:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchProfile = async (userId) => {
    if (!userId) return
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      if (data) {
        setProfile(data)
      }
    } catch (err) {
      console.error('Profile fetch error:', err)
    }
  }

  const storeGmailToken = async (session) => {
    if (!session?.provider_token || !session?.user?.id) return
    try {
      const expiry = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : new Date(Date.now() + 3500 * 1000).toISOString()

      // Upsert token
      await supabase.from('oauth_tokens').upsert({
        user_id: session.user.id,
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token ?? null,
        token_expiry: expiry,
        scope: 'gmail.modify gmail.readonly',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })

      // Also upsert profile with Google metadata
      const meta = session.user.user_metadata ?? {}
      await supabase.from('profiles').upsert({
        id: session.user.id,
        email: session.user.email ?? '',
        full_name: meta.full_name ?? meta.name ?? '',
        avatar_url: meta.avatar_url ?? meta.picture ?? '',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' })
    } catch (err) {
      console.error('Token/profile store error:', err)
    }
  }

  const doRefresh = useCallback(async (storedRefreshToken) => {
    try {
      const r = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: storedRefreshToken }),
      })
      const data = await r.json()
      if (!data.access_token) return null
      const newExpiry = Date.now() + (data.expires_in ?? 3600) * 1000
      tokenCache.current = { token: data.access_token, expiry: newExpiry }
      return data.access_token
    } catch (err) {
      console.error('Token refresh failed:', err)
      return null
    }
  }, [])

  const getGmailToken = useCallback(async () => {
    const BUFFER = 5 * 60 * 1000

    // 1. In-memory cache
    if (tokenCache.current?.token) {
      if (tokenCache.current.expiry > Date.now() + BUFFER) {
        return tokenCache.current.token
      }
    }

    // 2. Active session
    const { data: { session } } = await supabase.auth.getSession()
    if (session?.provider_token) {
      const expiry = (session.expires_at ?? 0) * 1000
      if (expiry > Date.now() + BUFFER) {
        tokenCache.current = { token: session.provider_token, expiry }
        return session.provider_token
      }
    }

    // 3. Stored token in DB
    if (!user) return null
    const { data: tokenData } = await supabase
      .from('oauth_tokens')
      .select('access_token, refresh_token, token_expiry')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!tokenData) return null

    const storedExpiry = tokenData.token_expiry
      ? new Date(tokenData.token_expiry).getTime()
      : 0

    if (storedExpiry > Date.now() + BUFFER) {
      tokenCache.current = { token: tokenData.access_token, expiry: storedExpiry }
      return tokenData.access_token
    }

    // 4. Refresh
    if (tokenData.refresh_token) {
      const newToken = await doRefresh(tokenData.refresh_token)
      if (newToken) return newToken
    }

    return null
  }, [user, doRefresh])

  const signIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: [
          'openid', 'email', 'profile',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.readonly',
        ].join(' '),
        queryParams: { access_type: 'offline', prompt: 'consent' },
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    tokenCache.current = null
    await supabase.auth.signOut()
  }, [])

  // Derived display name — user_metadata first, then profiles table, then fallback
  const displayName = user?.user_metadata?.full_name
    ?? user?.user_metadata?.name
    ?? profile?.full_name
    ?? user?.email?.split('@')[0]
    ?? 'User'

  const avatarUrl = user?.user_metadata?.avatar_url
    ?? user?.user_metadata?.picture
    ?? profile?.avatar_url
    ?? null

  return {
    user,
    profile,
    session,
    loading,
    signIn,
    signOut,
    getGmailToken,
    isAuthenticated: !!user,
    displayName,
    avatarUrl,
  }
}
