// POST /api/gmail/estimate
// Returns estimated email count for a Gmail query

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { accessToken, query } = req.body
  if (!accessToken) return res.status(401).json({ error: 'No token' })
  if (!query || query.trim() === '') return res.status(200).json({ count: 0 })

  try {
    const params = new URLSearchParams({ q: query.trim(), maxResults: 1 })
    const r = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    const data = await r.json()
    return res.status(200).json({ count: data.resultSizeEstimate ?? 0 })
  } catch {
    return res.status(200).json({ count: 0 })
  }
}
