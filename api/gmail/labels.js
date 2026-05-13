// POST /api/gmail/labels
// Returns user's existing Gmail label names (user-created only)

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { accessToken } = req.body
  if (!accessToken) return res.status(401).json({ error: 'No token' })

  try {
    const r = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/labels',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )
    if (!r.ok) return res.status(200).json({ labels: [] })

    const data = await r.json()
    // Only return user-created labels, not system ones (INBOX, TRASH, etc.)
    const labels = (data.labels ?? [])
      .filter(l => l.type === 'user')
      .map(l => l.name)
      .sort()

    return res.status(200).json({ labels })
  } catch {
    return res.status(200).json({ labels: [] })
  }
}
