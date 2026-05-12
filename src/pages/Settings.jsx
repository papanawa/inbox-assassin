import { useAuth } from '../hooks/useAuth'
import { User, Mail, Shield, Trash2 } from 'lucide-react'

export default function Settings() {
  const { user } = useAuth()

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-8">
        <h2 className="font-display font-700 text-3xl text-ink mb-1">Settings</h2>
        <p className="font-body text-sm text-ink-muted">
          Account and behavior configuration.
        </p>
      </div>

      {/* Account */}
      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-ink-muted" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-ink">Account</h3>
        </div>
        <div className="space-y-3">
          <SettingRow label="Name" value={user?.user_metadata?.full_name ?? '—'} />
          <SettingRow label="Email" value={user?.email ?? '—'} />
          <SettingRow label="Google ID" value={user?.user_metadata?.provider_id ?? '—'} mono />
        </div>
      </section>

      {/* Gmail Connection */}
      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Mail size={16} className="text-ink-muted" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-ink">Gmail Connection</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-body text-ink">Gmail API</div>
            <div className="text-xs font-mono text-ink-faint mt-0.5">gmail.modify · gmail.readonly</div>
          </div>
          <span className="badge-gray">Connected</span>
        </div>
      </section>

      {/* Safety */}
      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-ink-muted" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-ink">Safety Settings</h3>
        </div>
        <div className="space-y-4">
          <ToggleSetting
            label="Send to Trash (not permanent delete)"
            description="Emails go to Trash instead of being permanently deleted. You have 30 days to recover them."
            defaultOn
            locked
          />
          <ToggleSetting
            label="Require confirmation before each run"
            description="Show the pre-run summary gate every time. Recommended."
            defaultOn
          />
        </div>
      </section>

      {/* Danger zone */}
      <section className="card border-assassin-red/20">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={16} className="text-assassin-red" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-assassin-red">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-body text-ink">Delete all my data</div>
            <div className="text-xs font-body text-ink-faint mt-0.5">
              Removes all rules, logs, and tokens from Inbox Assassin. Does not affect Gmail.
            </div>
          </div>
          <button className="btn-danger text-xs py-2 px-3 cursor-crosshair" disabled title="Coming soon">
            Delete data
          </button>
        </div>
      </section>
    </div>
  )
}

function SettingRow({ label, value, mono }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-body text-ink-muted">{label}</span>
      <span className={`text-sm ${mono ? 'font-mono text-ink-muted text-xs' : 'font-body text-ink'}`}>
        {value}
      </span>
    </div>
  )
}

function ToggleSetting({ label, description, defaultOn, locked }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-body text-ink">{label}</div>
        <div className="text-xs font-body text-ink-faint mt-0.5 leading-relaxed">{description}</div>
      </div>
      <div className={`w-9 h-5 rounded-full flex items-center shrink-0 mt-0.5 ${
        defaultOn ? 'bg-ink' : 'bg-surface-border'
      } ${locked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}`}>
        <div className={`w-3.5 h-3.5 bg-white rounded-full mx-0.5 transition-transform ${
          defaultOn ? 'translate-x-4' : 'translate-x-0'
        }`} />
      </div>
    </div>
  )
}
