// POST /api/gmail/execute
// Fetches message IDs matching a query and performs the action on them

async function getOrCreateLabel(BASE, headers, rawLabelName) {
  const labelName = rawLabelName.trim().replace(/\s+/g, ' ')
  // First try to find existing label
  const listRes = await fetch(`${BASE}/labels`, { headers })
  if (listRes.ok) {
    const { labels } = await listRes.json()
    const existing = labels?.find(l => l.name.toLowerCase() === labelName.toLowerCase())
    if (existing) return existing.id
  }

  // Create the label
  const createRes = await fetch(`${BASE}/labels`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      name: labelName,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    }),
  })
  if (!createRes.ok) return null
  const label = await createRes.json()
  return label.id ?? null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    accessToken,
    query,
    action = 'trash',
    actionLabel,
    pageToken = null,
    maxResults = 500,
    fullRun = false,
  } = req.body

  if (!accessToken) return res.status(401).json({ error: 'No access token' })
  if (!query) return res.status(400).json({ error: 'No query provided' })

  const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  let allMessageIds = []
  let nextPageToken = pageToken
  let pages = 0
  const maxPages = fullRun ? 100 : 1

  try {
    // Step 1: If create_and_move, resolve the label ID upfront
    let resolvedLabelId = null
    if ((action === 'create_and_move' || action === 'move') && actionLabel) {
      resolvedLabelId = await getOrCreateLabel(BASE, headers, actionLabel)
      if (!resolvedLabelId) {
        return res.status(400).json({ error: `Could not create label: ${actionLabel}` })
      }
    }

    // Step 2: Fetch message IDs
    do {
      const params = new URLSearchParams({ q: query, maxResults: Math.min(maxResults, 500) })
      if (nextPageToken) params.set('pageToken', nextPageToken)

      const listRes = await fetch(`${BASE}/messages?${params}`, { headers })
      if (!listRes.ok) {
        const err = await listRes.json()
        return res.status(listRes.status).json({ error: err.error?.message ?? 'Gmail list failed' })
      }

      const listData = await listRes.json()
      const ids = (listData.messages ?? []).map(m => m.id)
      allMessageIds.push(...ids)
      nextPageToken = listData.nextPageToken ?? null
      pages++

      if (!fullRun) break
    } while (nextPageToken && pages < maxPages)

    if (allMessageIds.length === 0) {
      return res.status(200).json({ succeeded: 0, failed: 0, total: 0, nextPageToken: null })
    }

    // Step 3: Process in chunks of 50
    const CHUNK = 50
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < allMessageIds.length; i += CHUNK) {
      const chunk = allMessageIds.slice(i, i + CHUNK)
      try {
        let body

        if (action === 'trash' || action === 'unsubscribe_delete') {
          body = { ids: chunk, addLabelIds: ['TRASH'], removeLabelIds: ['INBOX', 'UNREAD'] }
        } else if (action === 'mark_read') {
          body = { ids: chunk, removeLabelIds: ['UNREAD'] }
        } else if ((action === 'move' || action === 'create_and_move') && resolvedLabelId) {
          body = { ids: chunk, addLabelIds: [resolvedLabelId], removeLabelIds: ['INBOX'] }
        } else {
          body = { ids: chunk, addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] }
        }

        const modifyRes = await fetch(`${BASE}/messages/batchModify`, {
          method: 'POST', headers, body: JSON.stringify(body),
        })

        if (modifyRes.ok || modifyRes.status === 204) {
          succeeded += chunk.length
        } else {
          failed += chunk.length
        }
      } catch {
        failed += chunk.length
      }
    }

    return res.status(200).json({
      succeeded,
      failed,
      total: allMessageIds.length,
      nextPageToken: fullRun ? null : nextPageToken,
    })
  } catch (err) {
    console.error('Execute error:', err)
    return res.status(500).json({ error: 'Execution failed' })
  }
}
