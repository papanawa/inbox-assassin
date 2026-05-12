// Vercel serverless function — Gmail message listing
// POST /api/gmail/messages

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { accessToken, query, pageToken, maxResults = 500, estimateOnly = false } = req.body

  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' })
  }

  try {
    const params = new URLSearchParams({
      q: query || '',
      maxResults: estimateOnly ? 1 : Math.min(maxResults, 500),
      ...(pageToken ? { pageToken } : {}),
    })

    const response = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    )

    if (!response.ok) {
      const err = await response.json()
      console.error('Gmail API error:', err)
      return res.status(response.status).json({
        error: err.error?.message ?? 'Gmail API error',
      })
    }

    const data = await response.json()

    return res.status(200).json({
      messages: data.messages ?? [],
      nextPageToken: data.nextPageToken ?? null,
      resultSizeEstimate: data.resultSizeEstimate ?? 0,
    })
  } catch (err) {
    console.error('Handler error:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
