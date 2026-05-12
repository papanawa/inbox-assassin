// POST /api/gmail/preview
// Returns 5 sample emails matching a query (subject + sender only, no body)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { accessToken, query, maxSamples = 5 } = req.body
  if (!accessToken) return res.status(401).json({ error: 'No token' })
  if (!query?.trim()) return res.status(200).json({ samples: [] })

  const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    // Step 1: get message IDs
    const listParams = new URLSearchParams({ q: query.trim(), maxResults: maxSamples })
    const listRes = await fetch(`${BASE}/messages?${listParams}`, { headers })
    if (!listRes.ok) return res.status(200).json({ samples: [] })

    const listData = await listRes.json()
    const messages = listData.messages ?? []
    if (messages.length === 0) return res.status(200).json({ samples: [] })

    // Step 2: fetch metadata for each message (subject + from only)
    const samples = await Promise.all(
      messages.slice(0, maxSamples).map(async ({ id }) => {
        try {
          const metaParams = new URLSearchParams({
            format: 'metadata',
            metadataHeaders: ['Subject', 'From', 'Date'],
          })
          const metaRes = await fetch(`${BASE}/messages/${id}?${metaParams}`, { headers })
          if (!metaRes.ok) return null

          const meta = await metaRes.json()
          const headers_ = meta.payload?.headers ?? []
          const get = (name) => headers_.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

          return {
            id,
            subject: get('Subject') || '(no subject)',
            from: get('From') || 'Unknown sender',
            date: get('Date'),
          }
        } catch {
          return null
        }
      })
    )

    return res.status(200).json({
      samples: samples.filter(Boolean),
      total: listData.resultSizeEstimate ?? 0,
    })
  } catch (err) {
    console.error('Preview error:', err)
    return res.status(200).json({ samples: [] })
  }
}
