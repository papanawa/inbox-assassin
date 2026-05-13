// GET /api/cron/auto-run
// Called by Vercel Cron hourly — checks which users are due for auto-run
// Uses Supabase service role key to bypass RLS

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function refreshGmailToken(refreshToken) {
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.VITE_GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await r.json()
  return data.access_token ?? null
}

async function buildQuery(rule) {
  switch (rule.rule_type) {
    case 'sender':  return `from:${rule.config?.email}`
    case 'domain':  return `from:@${rule.config?.domain}`
    case 'age':     return `older_than:${rule.config?.older_than_days}d`
    case 'keyword': return (rule.config?.keywords ?? []).join(' OR ')
    case 'label':   return `label:${rule.config?.label}`
    case 'newsletter': return 'list:* OR unsubscribe'
    default: return ''
  }
}

async function executeRule(rule, accessToken) {
  const query = await buildQuery(rule)
  if (!query) return { succeeded: 0, failed: 0, total: 0 }

  const BASE_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'https://inbox-assassin.vercel.app'

  const r = await fetch(`${BASE_URL}/api/gmail/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      accessToken,
      query,
      action: rule.action ?? 'trash',
      actionLabel: rule.action_config?.label ?? rule.config?.action_label ?? '',
      fullRun: true,
      maxResults: 500,
    }),
  })
  if (!r.ok) return { succeeded: 0, failed: 0, total: 0 }
  return r.json()
}

function isDue(settings, nowUTC) {
  if (!settings.auto_run_enabled) return false

  const hour = nowUTC.getUTCHours()
  if (hour !== settings.auto_run_hour) return false

  const lastRun = settings.last_auto_run_at
    ? new Date(settings.last_auto_run_at)
    : null

  if (settings.auto_run_frequency === 'daily') {
    if (!lastRun) return true
    const hoursSince = (nowUTC - lastRun) / (1000 * 60 * 60)
    return hoursSince >= 23
  }

  if (settings.auto_run_frequency === 'weekly') {
    const day = nowUTC.getUTCDay()
    if (day !== settings.auto_run_day) return false
    if (!lastRun) return true
    const daysSince = (nowUTC - lastRun) / (1000 * 60 * 60 * 24)
    return daysSince >= 6
  }

  return false
}

export default async function handler(req, res) {
  // Verify this is called by Vercel Cron (or our secret for testing)
  const authHeader = req.headers['authorization']
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const nowUTC = new Date()
  console.log(`Auto-run cron fired at ${nowUTC.toISOString()}`)

  try {
    // Get all users with auto-run enabled
    const { data: settingsList } = await supabase
      .from('user_settings')
      .select('*')
      .eq('auto_run_enabled', true)

    if (!settingsList?.length) {
      return res.status(200).json({ message: 'No users with auto-run enabled' })
    }

    const results = []

    for (const settings of settingsList) {
      if (!isDue(settings, nowUTC)) continue

      console.log(`Running auto-run for user ${settings.user_id}`)

      // Get refresh token
      const { data: tokenData } = await supabase
        .from('oauth_tokens')
        .select('refresh_token')
        .eq('user_id', settings.user_id)
        .maybeSingle()

      if (!tokenData?.refresh_token) {
        console.warn(`No refresh token for user ${settings.user_id}`)
        continue
      }

      // Get fresh access token
      const accessToken = await refreshGmailToken(tokenData.refresh_token)
      if (!accessToken) {
        console.warn(`Token refresh failed for user ${settings.user_id}`)
        continue
      }

      // Get auto rules
      const { data: autoRules } = await supabase
        .from('rules')
        .select('*')
        .eq('user_id', settings.user_id)
        .eq('is_active', true)
        .eq('is_auto', true)

      if (!autoRules?.length) continue

      // Execute each rule
      const ruleResults = []
      let totalDeleted = 0

      for (const rule of autoRules) {
        const result = await executeRule(rule, accessToken)
        ruleResults.push({
          rule_id: rule.id,
          rule_name: rule.name,
          emails_deleted: result.succeeded ?? 0,
        })
        totalDeleted += result.succeeded ?? 0

        // Update rule run stats
        await supabase.from('rules').update({
          run_count: (rule.run_count ?? 0) + 1,
          last_run_at: nowUTC.toISOString(),
        }).eq('id', rule.id)
      }

      // Log the run
      await supabase.from('deletion_logs').insert({
        user_id: settings.user_id,
        run_label: `Auto-run (${settings.auto_run_frequency})`,
        total_deleted: totalDeleted,
        rules_applied: ruleResults,
        status: 'completed',
        run_at: nowUTC.toISOString(),
      })

      // Create notification
      await supabase.from('notifications').insert({
        user_id: settings.user_id,
        title: 'Auto-run complete',
        message: `${totalDeleted} email${totalDeleted !== 1 ? 's' : ''} eliminated across ${autoRules.length} rule${autoRules.length !== 1 ? 's' : ''}.`,
        data: { totalDeleted, ruleCount: autoRules.length, ruleResults },
      })

      // Update last run time
      await supabase.from('user_settings').update({
        last_auto_run_at: nowUTC.toISOString(),
      }).eq('user_id', settings.user_id)

      results.push({ user_id: settings.user_id, totalDeleted })
    }

    return res.status(200).json({ ran: results.length, results })
  } catch (err) {
    console.error('Auto-run cron error:', err)
    return res.status(500).json({ error: err.message })
  }
}
