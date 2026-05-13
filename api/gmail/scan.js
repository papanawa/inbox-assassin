// POST /api/gmail/scan
// Scans recent inbox messages and returns top senders by volume
// with sample subject lines for each

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { accessToken, maxMessages = 300 } = req.body
  if (!accessToken) return res.status(401).json({ error: 'No token' })

  const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const headers = { Authorization: `Bearer ${accessToken}` }

  try {
    // Step 1: List recent INBOX messages
    const listParams = new URLSearchParams({
      labelIds: 'INBOX',
      maxResults: Math.min(maxMessages, 500),
    })
    const listRes = await fetch(`${BASE}/messages?${listParams}`, { headers })
    if (!listRes.ok) return res.status(listRes.status).json({ error: 'Gmail list failed' })

    const listData = await listRes.json()
    const messages = listData.messages ?? []
    if (messages.length === 0) return res.status(200).json({ senders: [], total: 0 })

    // Step 2: Fetch metadata in chunks of 50
    const CHUNK = 50
    const allMeta = []

    for (let i = 0; i < messages.length; i += CHUNK) {
      const chunk = messages.slice(i, i + CHUNK)
      const metas = await Promise.all(
        chunk.map(async ({ id }) => {
          try {
            const r = await fetch(
              `${BASE}/messages/${id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
              { headers }
            )
            if (!r.ok) return null
            const data = await r.json()
            const hdrs = data.payload?.headers ?? []
            const get = (name) => hdrs.find(h => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''
            return { from: get('From'), subject: get('Subject') }
          } catch { return null }
        })
      )
      allMeta.push(...metas.filter(Boolean))
    }

    // Step 3: Parse and group by sender
    const senderMap = {}

    for (const { from, subject } of allMeta) {
      if (!from) continue

      // Parse "Name <email@domain.com>" or "email@domain.com"
      const emailMatch = from.match(/<([^>]+)>/)
      const email = emailMatch ? emailMatch[1].toLowerCase() : from.toLowerCase().trim()
      const nameMatch = from.match(/^([^<]+)</)
      const name = nameMatch ? nameMatch[1].trim().replace(/^"|"$/g, '') : email

      if (!email.includes('@')) continue

      const domain = email.split('@')[1] ?? ''

      if (!senderMap[email]) {
        senderMap[email] = { email, name, domain, count: 0, subjects: [] }
      }
      senderMap[email].count++
      if (subject && senderMap[email].subjects.length < 3) {
        senderMap[email].subjects.push(subject)
      }
    }

    // Step 4: Sort by count, return top 25
    const senders = Object.values(senderMap)
      .sort((a, b) => b.count - a.count)
      .slice(0, 25)
      .map(s => ({
        ...s,
        subjects: [...new Set(s.subjects)].slice(0, 3), // dedupe
      }))

    return res.status(200).json({ senders, total: allMeta.length })
  } catch (err) {
    console.error('Scan error:', err)
    return res.status(500).json({ error: 'Scan failed' })
  }
}
