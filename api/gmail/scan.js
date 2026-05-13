// api/gmail/scan.js
// Scans 100 most recent inbox emails, groups by sender.
// Detects List-Unsubscribe headers to flag newsletter senders.

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function getValidToken(userId) {
  const { data: tokenRow, error } = await supabase
    .from('oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !tokenRow) throw new Error('No OAuth token found')

  const expiresAt = new Date(tokenRow.expires_at).getTime()
  if (expiresAt - Date.now() > 60_000) return tokenRow.access_token

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

function parseFromAddress(fromHeader) {
  if (!fromHeader) return { name: 'Unknown', email: '' }
  // Formats: "Name <email>" or "email"
  const match = fromHeader.match(/^(.*?)\s*<([^>]+)>$/)
  if (match) {
    return {
      name: match[1].replace(/"/g, '').trim() || match[2],
      email: match[2].toLowerCase().trim(),
    }
  }
  const email = fromHeader.toLowerCase().trim()
  return { name: email, email }
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const userId = req.query.userId
  if (!userId) return res.status(400).json({ error: 'Missing userId' })

  try {
    const accessToken = await getValidToken(userId)

    // Step 1: List 100 recent inbox messages (metadata only for speed)
    const listUrl = new URL('https://gmail.googleapis.com/gmail/v1/users/me/messages')
    listUrl.searchParams.set('maxResults', '100')
    listUrl.searchParams.set('labelIds', 'INBOX')
    listUrl.searchParams.set('q', '-in:sent -in:trash -in:draft')

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const listData = await listRes.json()
    const messages = listData.messages || []

    if (!messages.length) {
      return res.status(200).json({ senders: [] })
    }

    // Step 2: Fetch metadata for each message
    // Use batch-style: fetch in parallel with limit
    const PARALLEL = 10
    const messageDetails = []

    for (let i = 0; i < messages.length; i += PARALLEL) {
      const batch = messages.slice(i, i + PARALLEL)
      const fetched = await Promise.all(
        batch.map(async (msg) => {
          const url = `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date&metadataHeaders=List-Unsubscribe&metadataHeaders=List-Unsubscribe-Post`
          const r = await fetch(url, {
            headers: { Authorization: `Bearer ${accessToken}` },
          })
          return r.json()
        })
      )
      messageDetails.push(...fetched)
    }

    // Step 3: Group by sender
    const senderMap = new Map()

    for (const msg of messageDetails) {
      const headers = {}
      for (const h of msg.payload?.headers || []) {
        headers[h.name.toLowerCase()] = h.value
      }

      const { name, email } = parseFromAddress(headers['from'])
      if (!email) continue

      const domain = email.split('@')[1] || ''
      const subject = headers['subject'] || '(no subject)'
      const listUnsub = headers['list-unsubscribe'] || null
      const listUnsubPost = headers['list-unsubscribe-post'] || null

      if (!senderMap.has(email)) {
        senderMap.set(email, {
          email,
          name,
          domain,
          count: 0,
          subjects: [],
          hasUnsubscribe: false,
          listUnsubscribe: null,
          listUnsubscribePost: null,
        })
      }

      const sender = senderMap.get(email)
      sender.count++
      if (sender.subjects.length < 3) sender.subjects.push(subject)

      // Mark as newsletter if List-Unsubscribe header found
      if (listUnsub && !sender.hasUnsubscribe) {
        sender.hasUnsubscribe = true
        sender.listUnsubscribe = listUnsub
        sender.listUnsubscribePost = listUnsubPost
      }
    }

    // Step 4: Sort by count desc, return top 30
    const senders = Array.from(senderMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 30)

    return res.status(200).json({ senders })
  } catch (err) {
    console.error('Scan error:', err)
    return res.status(500).json({ error: err.message })
  }
}
