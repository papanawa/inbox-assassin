import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
        setLoading(false)

        // On sign-in, store the Gmail provider token in Supabase
        if (event === 'SIGNED_IN' && session?.provider_token) {
          await storeGmailToken(session)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  const storeGmailToken = async (session) => {
    if (!session?.provider_token) return
    try {
      await supabase.from('oauth_tokens').upsert({
        user_id: session.user.id,
        access_token: session.provider_token,
        refresh_token: session.provider_refresh_token ?? null,
        token_expiry: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : null,
        scope: 'gmail.modify gmail.readonly',
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    } catch (err) {
      console.error('Failed to store Gmail token:', err)
    }
  }

  const signIn = useCallback(async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        scopes: [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/gmail.modify',
          'https://www.googleapis.com/auth/gmail.readonly',
        ].join(' '),
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
  }, [])

  // Get the stored Gmail access token for API calls
  const getGmailToken = useCallback(async () => {
    if (!user) return null
    const { data } = await supabase
      .from('oauth_tokens')
      .select('access_token, token_expiry')
      .eq('user_id', user.id)
      .single()
    return data?.access_token ?? null
  }, [user])

  return {
    user,
    session,
    loading,
    signIn,
    signOut,
    getGmailToken,
    isAuthenticated: !!user,
  }
}
