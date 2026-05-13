import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const tokenCache = useRef(null) // { token, expiry }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

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
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const storeGmailToken = async (session) => {
    if (!session?.provider_token) return
    try {
      const expiry = session.expires_at
        ? new Date(session.expires_at * 1000).toISOString()
        : new Date(Date.now() + 3500 * 1000).toISOString()

      await supabase.from('oauth_tokens').upsert({
        user_id: session.user.id,
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token ?? null,
        token_expiry: expiry,
        scope: 'gmail.modify gmail.readonly',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch (err) {
      console.error('Failed to store Gmail token:', err)
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

    // 4. Refresh if we have a refresh token
    if (tokenData.refresh_token) {
      console.log('Gmail token expired — refreshing...')
      const newToken = await doRefresh(tokenData.refresh_token)
      if (newToken) return newToken
    }

    console.warn('No valid Gmail token. User must sign in again.')
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

  return { user, session, loading, signIn, signOut, getGmailToken, isAuthenticated: !!user }
}
