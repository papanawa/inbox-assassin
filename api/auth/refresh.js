// POST /api/auth/refresh
// Uses the stored refresh token to get a new Gmail access token

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { refreshToken } = req.body
  if (!refreshToken) return res.status(400).json({ error: 'No refresh token' })

  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.VITE_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    const data = await response.json()

    if (!data.access_token) {
      console.error('Token refresh failed:', data)
      return res.status(401).json({ error: 'Refresh failed', detail: data.error })
    }

    return res.status(200).json({
      access_token: data.access_token,
      expires_in: data.expires_in ?? 3600,
    })
  } catch (err) {
    console.error('Refresh error:', err)
    return res.status(500).json({ error: 'Refresh failed' })
  }
}
