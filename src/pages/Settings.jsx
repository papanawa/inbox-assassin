import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../hooks/useAuth'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  return { value: i, label: `${h}:00 ${ampm} UTC` }
})

function scheduleSummary(settings) {
  if (!settings.schedule_enabled) return 'Disabled — rules run manually only'
  const hour = HOURS[settings.hour_utc]?.label || `${settings.hour_utc}:00 UTC`
  if (settings.frequency === 'daily') {
    return `Runs daily at ${hour}`
  }
  const day = DAYS[settings.day_of_week] || 'Sunday'
  return `Runs every ${day} at ${hour}`
}

export default function Settings() {
  const { user, signOut } = useAuth()
  const [settings, setSettings] = useState({
    schedule_enabled: false,
    frequency: 'daily',
    day_of_week: 1,
    hour_utc: 9,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user?.id) loadSettings()
  }, [user])

  async function loadSettings() {
    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (data) {
      setSettings({
        schedule_enabled: data.schedule_enabled ?? false,
        frequency: data.frequency ?? 'daily',
        day_of_week: data.day_of_week ?? 1,
        hour_utc: data.hour_utc ?? 9,
      })
    }
    setLoading(false)
  }

  async function saveSettings() {
    setSaving(true)
    setSaved(false)

    const payload = {
      user_id: user.id,
      schedule_enabled: settings.schedule_enabled,
      frequency: settings.frequency,
      day_of_week: settings.day_of_week,
      hour_utc: settings.hour_utc,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('user_settings')
      .upsert(payload, { onConflict: 'user_id' })

    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    }
  }

  function update(key, value) {
    setSettings(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  if (loading) {
    return (
      <div className="p-8 text-gray-400 text-sm">Loading settings…</div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>
          Settings
        </h1>
        <p className="text-gray-500 text-sm mt-1">Configure auto-run schedule and account options.</p>
      </div>

      {/* Scheduled Auto-Runs */}
      <section className="bg-white border border-gray-100 rounded-xl p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>
            Scheduled Auto-Runs
          </h2>
          <p className="text-gray-400 text-xs mt-1">
            Automatically run rules marked as ⚡ Auto on a schedule — no action needed.
          </p>
        </div>

        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-ink">Enable scheduled runs</p>
            <p className="text-xs text-gray-400 mt-0.5">{scheduleSummary(settings)}</p>
          </div>
          <button
            onClick={() => update('schedule_enabled', !settings.schedule_enabled)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
              settings.schedule_enabled ? 'bg-assassin-red' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                settings.schedule_enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {settings.schedule_enabled && (
          <div className="space-y-4 pt-2 border-t border-gray-50">
            {/* Frequency */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Frequency</label>
              <div className="flex gap-3 mt-2">
                {['daily', 'weekly'].map(f => (
                  <button
                    key={f}
                    onClick={() => update('frequency', f)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-colors ${
                      settings.frequency === f
                        ? 'bg-ink text-white border-ink'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Day of week (weekly only) */}
            {settings.frequency === 'weekly' && (
              <div>
                <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Day of week</label>
                <select
                  value={settings.day_of_week}
                  onChange={e => update('day_of_week', Number(e.target.value))}
                  className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
                >
                  {DAYS.map((day, i) => (
                    <option key={i} value={i}>{day}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Hour */}
            <div>
              <label className="text-xs font-medium text-gray-600 uppercase tracking-wide">Time (UTC)</label>
              <select
                value={settings.hour_utc}
                onChange={e => update('hour_utc', Number(e.target.value))}
                className="mt-2 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-ink focus:outline-none focus:border-ink"
              >
                {HOURS.map(h => (
                  <option key={h.value} value={h.value}>{h.label}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Cron runs on UTC time. San Antonio (CDT) is UTC−5.
              </p>
            </div>
          </div>
        )}

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={saveSettings}
            disabled={saving}
            className="bg-ink text-white text-sm font-medium px-5 py-2 rounded-lg hover:bg-gray-900 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save Schedule'}
          </button>
          {saved && (
            <span className="text-green-600 text-sm">✓ Saved</span>
          )}
        </div>
      </section>

      {/* Account */}
      <section className="bg-white border border-gray-100 rounded-xl p-6 space-y-4">
        <h2 className="text-base font-semibold text-ink" style={{ fontFamily: 'Syne, sans-serif' }}>
          Account
        </h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-ink">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5">Signed in via Google</p>
          </div>
          <button
            onClick={signOut}
            className="text-sm text-gray-400 hover:text-assassin-red transition-colors border border-gray-200 hover:border-red-200 px-4 py-1.5 rounded-lg"
          >
            Sign out
          </button>
        </div>
      </section>
    </div>
  )
}
