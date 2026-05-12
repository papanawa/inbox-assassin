import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Crosshair } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'

export default function Login() {
  const { signIn, isAuthenticated, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && isAuthenticated) {
      navigate('/', { replace: true })
    }
  }, [isAuthenticated, loading, navigate])

  const handleSignIn = async () => {
    try {
      await signIn()
    } catch (err) {
      console.error('Sign-in error:', err)
    }
  }

  return (
    <div className="min-h-screen bg-surface-muted flex items-center justify-center p-6">
      {/* Background grid */}
      <div className="fixed inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#0D0D0D 1px, transparent 1px), linear-gradient(90deg, #0D0D0D 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative w-full max-w-sm animate-slide-up">
        {/* Card */}
        <div className="bg-surface-DEFAULT border border-surface-border rounded-2xl p-8 shadow-sm">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-ink-DEFAULT rounded-xl flex items-center justify-center">
              <Crosshair size={20} className="text-assassin-red" strokeWidth={2.5} />
            </div>
            <div>
              <div className="font-display font-700 text-base text-ink-DEFAULT leading-tight tracking-tight">
                INBOX
              </div>
              <div className="font-display font-800 text-base text-assassin-red leading-tight tracking-tight">
                ASSASSIN
              </div>
            </div>
          </div>

          {/* Headline */}
          <div className="mb-6">
            <h1 className="font-display font-700 text-2xl text-ink-DEFAULT mb-2 leading-tight">
              Clean inbox.<br />Zero mercy.
            </h1>
            <p className="font-body text-sm text-ink-muted leading-relaxed">
              Sign in with Google to connect your Gmail and start eliminating inbox clutter with precision rules.
            </p>
          </div>

          {/* Sign in button */}
          <button
            onClick={handleSignIn}
            className="w-full flex items-center justify-center gap-3 bg-ink-DEFAULT text-white 
                       font-body font-medium text-sm py-3 px-4 rounded-xl
                       hover:bg-ink-muted transition-all duration-200 cursor-crosshair"
          >
            <GoogleIcon />
            Sign in with Google
          </button>

          {/* Disclaimer */}
          <p className="text-xs font-body text-ink-faint text-center mt-5 leading-relaxed">
            We request Gmail access to read and delete emails per your rules. 
            Your data never leaves your account.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-xs font-mono text-ink-faint mt-6">
          A Goochey Group tool · Personal use
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}
