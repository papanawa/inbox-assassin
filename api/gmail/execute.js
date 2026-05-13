// api/gmail/execute.js
// Executes rules against Gmail. For unsubscribe_delete, fires actual unsubscribe first.

import { createClient } from '@supabase/supabase-js'
import { performUnsubscribe } from './unsubscribe.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Token helper ────────────────────────────────────────────────────────────

async function getValidToken(userId) {
  const { data: tokenRow, error } = await supabase
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !tokenRow) throw new Error('No OAuth token found')

  const expiresAt = new Date(tokenRow.expires_at).getTime()
  if (expiresAt - Date.now() > 60_000) return tokenRow.access_token

  // Refresh
  const params = new URLSearchParams({
    client_id: process.env.VITE_GOOGLE_CLIENT_ID,
    client_secret: process.env.GOOGLE_CLIENT_SECRET,
    refresh_token: tokenRow.refresh_token,
    grant_type: 'refresh_token',
  })

  const refreshRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  })

  const json = await refreshRes.json()
  if (!json.access_token) throw new Error('Token refresh failed')

  await supabase
    .from('oauth_tokens')
    .update({
      access_token: json.access_token,
      expires_at: new Date(Date.now() + json.expires_in * 1000).toISOString(),
    })
    .eq('user_id', userId)

  return json.access_token
}

// ─── Query builder ────────────────────────────────────────────────────────────

function buildQuery(rule) {
  switch (rule.target_type) {
    case 'sender':
      return `from:${rule.target_value}`
    case 'domain':
      return `from:@${rule.target_value}`
    case 'age':
      return `older_than:${rule.target_value}d`
    case 'keyword':
      return `subject:${rule.target_value}`
    case 'label':
      return `label:${rule.target_value.replace(/\s+/g, '-')}`
    case 'newsletter':
      return `(list:* OR from:(*newsletter* OR *noreply* OR *no-reply* OR *unsubscribe*))`
    default:
      return ''
  }
}

// ─── Gmail helpers ────────────────────────────────────────────────────────────

async function listMessages(accessToken, query, maxResults = 500) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('q', `${query} -in:trash -in:sent`)
  url.searchParams.set('maxResults', String(maxResults))

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return data.messages || []
}

async function getMessageHeaders(accessToken, messageId) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post`
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  const headers = {}
  for (const h of data.payload?.headers || []) {
    headers[h.name.toLowerCase()] = h.value
  }
  return headers
}

async function trashMessage(accessToken, messageId) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  )
}

async function markRead(accessToken, messageId) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    }
  )
}

async function moveToLabel(accessToken, messageId, labelId) {
  await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        addLabelIds: [labelId],
        removeLabelIds: ['INBOX'],
      }),
    }
  )
}

async function getOrCreateLabel(accessToken, labelName) {
  // List labels
  const listRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )
  const listData = await listRes.json()
  const existing = (listData.labels || []).find(
    l => l.name.toLowerCase() === labelName.toLowerCase()
  )
  if (existing) return existing.id

  // Create
  const createRes = await fetch(
    'https://gmail.googleapis.com/gmail/v1/users/me/labels',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: labelName }),
    }
  )
  const created = await createRes.json()
  return created.id
}

// ─── Execute single rule ──────────────────────────────────────────────────────

async function executeRule(rule, accessToken, maxResults) {
  const query = buildQuery(rule)
  if (!query) return { rule: rule.name, count: 0, error: 'Invalid rule' }

  const messages = await listMessages(accessToken, query, maxResults)
  if (!messages.length) return { rule: rule.name, count: 0 }

  let processed = 0
  let unsubscribed = 0

  for (const msg of messages) {
    try {
      if (rule.action === 'trash') {
        await trashMessage(accessToken, msg.id)
        processed++

      } else if (rule.action === 'mark_read') {
        await markRead(accessToken, msg.id)
        processed++

      } else if (rule.action === 'move') {
        const labelId = rule.destination_label_id || rule.destination_label
        if (labelId) {
          await moveToLabel(accessToken, msg.id, labelId)
          processed++
        }

      } else if (rule.action === 'create_and_move') {
        const labelId = await getOrCreateLabel(accessToken, rule.destination_label)
        await moveToLabel(accessToken, msg.id, labelId)
        processed++

      } else if (rule.action === 'unsubscribe_delete') {
        // Get List-Unsubscribe header from this message
        const headers = await getMessageHeaders(accessToken, msg.id)
        const listUnsub = headers['list-unsubscribe']
        const listUnsubPost = headers['list-unsubscribe-post']

        if (listUnsub) {
          const result = await performUnsubscribe(listUnsub, listUnsubPost, accessToken)
          if (result.success) unsubscribed++
        }

        // Always trash regardless of unsubscribe result
        await trashMessage(accessToken, msg.id)
        processed++
      }
    } catch (err) {
      console.warn(`Failed on message ${msg.id}:`, err.message)
    }
  }

  return {
    rule: rule.name,
    action: rule.action,
    count: processed,
    unsubscribed: rule.action === 'unsubscribe_delete' ? unsubscribed : undefined,
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { userId, rules, batchSize = 500 } = req.body

  if (!userId || !rules?.length) {
    return res.status(400).json({ error: 'Missing userId or rules' })
  }

  try {
    const accessToken = await getValidToken(userId)
    const results = []

    for (const rule of rules) {
      const result = await executeRule(rule, accessToken, batchSize)
      results.push(result)

      // Log to Supabase
      if (result.count > 0) {
        await supabase.from('deletion_logs').insert({
          user_id: userId,
          rule_id: rule.id,
          rule_name: rule.name,
          action: rule.action,
          emails_affected: result.count,
          unsubscribed: result.unsubscribed ?? 0,
          run_at: new Date().toISOString(),
        })
      }
    }

    const totalAffected = results.reduce((sum, r) => sum + (r.count || 0), 0)
    const totalUnsubscribed = results.reduce((sum, r) => sum + (r.unsubscribed || 0), 0)

    return res.status(200).json({ results, totalAffected, totalUnsubscribed })
  } catch (err) {
    console.error('Execute error:', err)
    return res.status(500).json({ error: err.message })
  }
}
