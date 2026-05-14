// api/gmail/execute.js
// Receives pre-built query from RunProgress and executes the action.
// Input: { accessToken, query, action, actionLabel, maxResults, fullRun }
// Output: { succeeded, failed, total, action, actionLabel }

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ─── Gmail helpers ────────────────────────────────────────────────────────────

async function listMessages(accessToken, query, maxResults) {
  const url = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
  url.searchParams.set('q', `${query} -in:trash -in:sent -in:draft`)
  url.searchParams.set('maxResults', String(maxResults))

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const data = await res.json()
  return { messages: data.messages || [], nextPageToken: data.nextPageToken }
}

async function trashMessage(accessToken, id) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/trash`,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
  )
  return res.ok
}

async function markRead(accessToken, id) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ removeLabelIds: ['UNREAD'] }),
    }
  )
  return res.ok
}

async function resolveOrCreateLabel(accessToken, labelName, action) {
  const listRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  const listData = await listRes.json()
  const existing = (listData.labels || []).find(
    l => l.name.toLowerCase() === labelName.toLowerCase()
  )
  if (existing) return existing.id

  // Only create if action is create_and_move
  if (action !== 'create_and_move') return null

  const createRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/labels', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: labelName }),
  })
  const created = await createRes.json()
  return created.id || null
}

async function moveMessage(accessToken, id, labelId) {
  const res = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}/modify`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addLabelIds: [labelId], removeLabelIds: ['INBOX'] }),
    }
  )
  return res.ok
}

async function getMessageHeaders(accessToken, id) {
  const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${id}?format=metadata&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post`
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } })
  const data = await res.json()
  const headers = {}
  for (const h of data.payload?.headers || []) {
    headers[h.name.toLowerCase()] = h.value
  }
  return headers
}

async function performUnsubscribe(listUnsubscribe, listUnsubscribePost, accessToken) {
  const parts = listUnsubscribe.split(',').map(s => s.trim())
  let httpUrl = null
  let mailtoRaw = null

  for (const part of parts) {
    const match = part.match(/<([^>]+)>/)
    if (!match) continue
    const url = match[1]
    if (url.startsWith('http://') || url.startsWith('https://')) httpUrl = url
    else if (url.startsWith('mailto:')) mailtoRaw = url
  }

  if (httpUrl) {
    try {
      const isOneClick = listUnsubscribePost?.toLowerCase().includes('one-click')
      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: isOneClick ? 'List-Unsubscribe=One-Click' : '',
        redirect: 'follow',
        signal: AbortSignal.timeout(6000),
      })
      if (response.ok || response.status === 301 || response.status === 302) {
        return true
      }
    } catch (err) {
      console.warn('HTTP unsubscribe failed:', err.message)
    }
  }

  if (mailtoRaw) {
    try {
      const withoutScheme = mailtoRaw.replace('mailto:', '')
      const [address, queryString] = withoutScheme.split('?')
      const params = new URLSearchParams(queryString || '')
      const subject = params.get('subject') || 'Unsubscribe'
      const body = params.get('body') || 'Please unsubscribe me.'
      const emailLines = [
        `To: ${address}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `MIME-Version: 1.0`,
        '', body,
      ]
      const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url')
      const gmailRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw }),
          signal: AbortSignal.timeout(6000),
        }
      )
      return gmailRes.ok
    } catch (err) {
      console.warn('Mailto unsubscribe failed:', err.message)
    }
  }

  return false
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const {
    accessToken,
    query,
    action = 'trash',
    actionLabel = '',
    maxResults = 500,
    fullRun = false,
  } = req.body

  if (!accessToken || !query) {
    return res.status(400).json({ error: 'Missing accessToken or query' })
  }

  try {
    const limit = fullRun ? 500 : Math.min(maxResults, 500)
    const { messages, nextPageToken } = await listMessages(accessToken, query, limit)

    if (!messages.length) {
      return res.status(200).json({ succeeded: 0, failed: 0, total: 0, action, actionLabel })
    }

    // Resolve label ID once if needed
    let labelId = null
    if ((action === 'move' || action === 'create_and_move') && actionLabel) {
      labelId = await resolveOrCreateLabel(accessToken, actionLabel, action)
    }

    let succeeded = 0
    let failed = 0
    let unsubscribed = 0

    for (const msg of messages) {
      try {
        let ok = false

        if (action === 'trash') {
          ok = await trashMessage(accessToken, msg.id)

        } else if (action === 'mark_read') {
          ok = await markRead(accessToken, msg.id)

        } else if (action === 'move' || action === 'create_and_move') {
          if (labelId) {
            ok = await moveMessage(accessToken, msg.id, labelId)
          }

        } else if (action === 'unsubscribe_delete') {
          const headers = await getMessageHeaders(accessToken, msg.id)
          const listUnsub = headers['list-unsubscribe']
          const listUnsubPost = headers['list-unsubscribe-post']
          if (listUnsub) {
            const didUnsub = await performUnsubscribe(listUnsub, listUnsubPost, accessToken)
            if (didUnsub) unsubscribed++
          }
          ok = await trashMessage(accessToken, msg.id)
        }

        if (ok) succeeded++
        else failed++
      } catch (err) {
        console.warn(`Message ${msg.id} failed:`, err.message)
        failed++
      }
    }

    return res.status(200).json({
      succeeded,
      failed,
      total: messages.length,
      unsubscribed: action === 'unsubscribe_delete' ? unsubscribed : undefined,
      action,
      actionLabel,
      nextPageToken,
    })
  } catch (err) {
    console.error('Execute error:', err)
    return res.status(500).json({ error: err.message })
  }
}
