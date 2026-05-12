// Vercel serverless function — Gmail message deletion / move
// POST /api/gmail/delete

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { accessToken, messageIds, action = 'trash', targetLabel } = req.body

  if (!accessToken) {
    return res.status(401).json({ error: 'No access token provided' })
  }
  if (!messageIds?.length) {
    return res.status(400).json({ error: 'No message IDs provided' })
  }

  const BASE = 'https://gmail.googleapis.com/gmail/v1/users/me'
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  }

  let succeeded = 0
  let failed = 0

  // Process in chunks of 50 (Gmail batch limit safety margin)
  const CHUNK_SIZE = 50
  const chunks = []
  for (let i = 0; i < messageIds.length; i += CHUNK_SIZE) {
    chunks.push(messageIds.slice(i, i + CHUNK_SIZE))
  }

  for (const chunk of chunks) {
    try {
      if (action === 'trash') {
        // Use batchModify to add TRASH label and remove INBOX
        const response = await fetch(`${BASE}/messages/batchModify`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ids: chunk,
            addLabelIds: ['TRASH'],
            removeLabelIds: ['INBOX', 'UNREAD'],
          }),
        })
        if (response.ok || response.status === 204) {
          succeeded += chunk.length
        } else {
          failed += chunk.length
        }
      } else if (action === 'move' && targetLabel) {
        // Move to a label — label must exist
        const response = await fetch(`${BASE}/messages/batchModify`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            ids: chunk,
            addLabelIds: [targetLabel],
            removeLabelIds: ['INBOX'],
          }),
        })
        if (response.ok || response.status === 204) {
          succeeded += chunk.length
        } else {
          failed += chunk.length
        }
      }
    } catch (err) {
      console.error('Chunk error:', err)
      failed += chunk.length
    }
  }

  return res.status(200).json({ succeeded, failed, total: messageIds.length })
}
