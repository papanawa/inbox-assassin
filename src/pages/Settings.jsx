import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { User, Mail, Shield, Trash2, Zap, Clock } from 'lucide-react'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  return { value: i, label: `${h}:00 ${ampm}` }
})

export default function Settings() {
  const { user } = useAuth()
  const [settings, setSettings] = useState({
    auto_run_enabled: false,
    auto_run_frequency: 'weekly',
    auto_run_hour: 9,
    auto_run_day: 1,
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return
    fetchSettings()
  }, [user])

  const fetchSettings = async () => {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) setSettings(data)
  }

  const saveSettings = async () => {
    setSaving(true)
    await supabase.from('user_settings').upsert({
      user_id: user.id,
      ...settings,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const update = (key, value) => setSettings(prev => ({ ...prev, [key]: value }))

  return (
    <div className="max-w-2xl animate-slide-up">
      <div className="mb-8">
        <h2 className="font-display font-700 text-3xl text-ink mb-1">Settings</h2>
        <p className="font-body text-sm text-ink-muted">Account and behavior configuration.</p>
      </div>

      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <User size={16} className="text-ink-muted" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-ink">Account</h3>
        </div>
        <div className="space-y-3">
          <SettingRow label="Name" value={user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? '—'} />
          <SettingRow label="Email" value={user?.email ?? '—'} />
        </div>
      </section>

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

      <section className="card mb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-500" strokeWidth={2} />
            <h3 className="font-display font-600 text-sm text-ink">Scheduled Auto-Runs</h3>
          </div>
          <button
            onClick={() => update('auto_run_enabled', !settings.auto_run_enabled)}
            className={`w-9 h-5 rounded-full flex items-center transition-colors duration-200 ${
              settings.auto_run_enabled ? 'bg-amber-500' : 'bg-surface-border'
            }`}
          >
            <div className={`w-3.5 h-3.5 bg-white rounded-full mx-0.5 transition-transform duration-200 ${
              settings.auto_run_enabled ? 'translate-x-4' : 'translate-x-0'
            }`} />
          </button>
        </div>

        {settings.auto_run_enabled && (
          <div className="space-y-4 animate-fade-in">
            <p className="text-xs font-body text-ink-muted leading-relaxed">
              Rules marked <span className="text-amber-600 font-medium">Auto</span> on the Rules page run automatically on this schedule. Manual rules only run when you click Run Cleanup.
            </p>

            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-2">Frequency</label>
              <div className="grid grid-cols-2 gap-2">
                {['daily', 'weekly'].map(freq => (
                  <button key={freq} onClick={() => update('auto_run_frequency', freq)}
                    className={`py-2.5 rounded-xl border text-xs font-body font-medium capitalize transition-all ${
                      settings.auto_run_frequency === freq
                        ? 'border-ink bg-ink text-white'
                        : 'border-surface-border text-ink-muted hover:border-ink-muted'
                    }`}>{freq}</button>
                ))}
              </div>
            </div>

            {settings.auto_run_frequency === 'weekly' && (
              <div className="animate-fade-in">
                <label className="block text-xs font-body font-medium text-ink-muted mb-2">Day</label>
                <div className="grid grid-cols-7 gap-1">
                  {DAYS.map((day, i) => (
                    <button key={i} onClick={() => update('auto_run_day', i)}
                      className={`py-2 rounded-lg text-xs font-body transition-all ${
                        settings.auto_run_day === i
                          ? 'bg-ink text-white'
                          : 'bg-surface-muted text-ink-muted hover:bg-surface-hover'
                      }`}>{day.slice(0, 3)}</button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-body font-medium text-ink-muted mb-2">Time (UTC)</label>
              <select className="input" value={settings.auto_run_hour}
                onChange={e => update('auto_run_hour', parseInt(e.target.value))}>
                {HOURS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <p className="text-xs font-body text-ink-faint mt-1.5">
                San Antonio CDT is UTC−5. 9:00 AM CDT = 14:00 UTC.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
              <div className="flex items-center gap-2 mb-1">
                <Clock size={12} className="text-amber-600" strokeWidth={2} />
                <span className="text-xs font-body font-medium text-amber-600">Schedule</span>
              </div>
              <p className="text-xs font-body text-amber-700">
                {settings.auto_run_frequency === 'daily'
                  ? `Every day at ${HOURS[settings.auto_run_hour].label} UTC`
                  : `Every ${DAYS[settings.auto_run_day]} at ${HOURS[settings.auto_run_hour].label} UTC`}
              </p>
            </div>
          </div>
        )}

        <button onClick={saveSettings} disabled={saving} className="mt-4 btn-primary w-full">
          {saved ? '✓ Saved' : saving ? 'Saving...' : 'Save Schedule'}
        </button>
      </section>

      <section className="card mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Shield size={16} className="text-ink-muted" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-ink">Safety</h3>
        </div>
        <div className="space-y-2 text-xs font-body text-ink-muted leading-relaxed">
          <p>✓ Emails go to Trash — recoverable for 30 days</p>
          <p>✓ Auto-runs are logged to Audit Log with full breakdown</p>
          <p>✓ You are notified in-app after every auto-run</p>
        </div>
      </section>

      <section className="card border-assassin-red/20">
        <div className="flex items-center gap-2 mb-4">
          <Trash2 size={16} className="text-assassin-red" strokeWidth={2} />
          <h3 className="font-display font-600 text-sm text-assassin-red">Danger Zone</h3>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-body text-ink">Delete all my data</div>
            <div className="text-xs font-body text-ink-faint mt-0.5">Removes all rules, logs, and tokens. Does not affect Gmail.</div>
          </div>
          <button className="btn-danger text-xs py-2 px-3 opacity-50 cursor-not-allowed" disabled>Delete data</button>
        </div>
      </section>
    </div>
  )
}

function SettingRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs font-body text-ink-muted">{label}</span>
      <span className="text-sm font-body text-ink">{value}</span>
    </div>
  )
}
// build 20260513-141142


