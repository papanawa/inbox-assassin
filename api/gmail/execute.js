// POST /api/gmail/execute
// Fetches message IDs matching a query and performs the action on them

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    accessToken,
    query,
    action = 'trash',
    actionLabel,
    pageToken = null,
    maxResults = 500, // batch size
    fullRun = false,  // if true, paginate through all pages
  } = req.body

  if (!accessToken) return res.status(401).json({ error: 'No access token' })
  if (!query) return res.status(400).json({ error: 'No query provided' })

  const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const headers = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }

  let allMessageIds = []
  let nextPageToken = pageToken
  let pages = 0
  const maxPages = fullRun ? 100 : 1 // full run paginates up to 100 pages (50k emails)

  try {
    // Fetch message IDs
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

      if (!fullRun) break // batch mode: one page only
    } while (nextPageToken && pages < maxPages)

    if (allMessageIds.length === 0) {
      return res.status(200).json({ succeeded: 0, failed: 0, total: 0, nextPageToken: null })
    }

    // Process in chunks of 50
    const CHUNK = 50
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < allMessageIds.length; i += CHUNK) {
      const chunk = allMessageIds.slice(i, i + CHUNK)
      try {
        let modifyRes

        if (action === 'trash') {
          modifyRes = await fetch(`${BASE}/messages/batchModify`, {
            method: 'POST', headers,
            body: JSON.stringify({ ids: chunk, addLabelIds: ['TRASH'], removeLabelIds: ['INBOX', 'UNREAD'] }),
          })
        } else if (action === 'mark_read') {
          modifyRes = await fetch(`${BASE}/messages/batchModify`, {
            method: 'POST', headers,
            body: JSON.stringify({ ids: chunk, removeLabelIds: ['UNREAD'] }),
          })
        } else if (action === 'move' && actionLabel) {
          modifyRes = await fetch(`${BASE}/messages/batchModify`, {
            method: 'POST', headers,
            body: JSON.stringify({ ids: chunk, addLabelIds: [actionLabel], removeLabelIds: ['INBOX'] }),
          })
        } else if (action === 'unsubscribe_delete') {
          // For now: trash only (unsubscribe header parsing is Phase 6)
          modifyRes = await fetch(`${BASE}/messages/batchModify`, {
            method: 'POST', headers,
            body: JSON.stringify({ ids: chunk, addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] }),
          })
        } else if (action === 'create_and_move' && actionLabel) {
          modifyRes = await fetch(`${BASE}/messages/batchModify`, {
            method: 'POST', headers,
            body: JSON.stringify({ ids: chunk, addLabelIds: [actionLabel], removeLabelIds: ['INBOX'] }),
          })
        } else {
          // Default: trash
          modifyRes = await fetch(`${BASE}/messages/batchModify`, {
            method: 'POST', headers,
            body: JSON.stringify({ ids: chunk, addLabelIds: ['TRASH'], removeLabelIds: ['INBOX'] }),
          })
        }

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
      nextPageToken: fullRun ? null : nextPageToken, // for batch mode: next page token
    })
  } catch (err) {
    console.error('Execute error:', err)
    return res.status(500).json({ error: 'Execution failed' })
  }
}
