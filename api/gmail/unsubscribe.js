// api/gmail/unsubscribe.js
// Handles actual unsubscribe execution
// Prefers HTTP POST (RFC 8058 one-click), falls back to mailto via Gmail send

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { listUnsubscribe, listUnsubscribePost, accessToken } = req.body

  if (!listUnsubscribe || !accessToken) {
    return res.status(400).json({ error: 'Missing listUnsubscribe or accessToken' })
  }

  const result = await performUnsubscribe(listUnsubscribe, listUnsubscribePost, accessToken)
  return res.status(200).json(result)
}

export async function performUnsubscribe(listUnsubscribe, listUnsubscribePost, accessToken) {
  // Parse List-Unsubscribe header
  // Format examples:
  //   <https://example.com/unsub?token=abc>
  //   <https://example.com/unsub>, <mailto:unsub@example.com>
  //   <mailto:unsub@example.com?subject=unsubscribe>

  const parts = listUnsubscribe.split(',').map(s => s.trim())

  let httpUrl = null
  let mailtoRaw = null

  for (const part of parts) {
    const match = part.match(/<([^>]+)>/)
    if (!match) continue
    const url = match[1]
    if (url.startsWith('http://') || url.startsWith('https://')) {
      httpUrl = url
    } else if (url.startsWith('mailto:')) {
      mailtoRaw = url
    }
  }

  // Prefer HTTP one-click (RFC 8058)
  if (httpUrl) {
    try {
      const isOneClick = listUnsubscribePost?.toLowerCase().includes('one-click')
      const response = await fetch(httpUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'InboxAssassin/1.0',
        },
        body: isOneClick ? 'List-Unsubscribe=One-Click' : '',
        redirect: 'follow',
        signal: AbortSignal.timeout(8000),
      })

      if (response.ok || response.status === 302 || response.status === 301) {
        return { method: 'http', success: true, url: httpUrl }
      }
    } catch (err) {
      // Fall through to mailto
      console.warn('HTTP unsubscribe failed, trying mailto:', err.message)
    }
  }

  // Mailto fallback — send via Gmail API
  if (mailtoRaw) {
    try {
      const withoutScheme = mailtoRaw.replace('mailto:', '')
      const [address, queryString] = withoutScheme.split('?')
      const params = new URLSearchParams(queryString || '')
      const subject = params.get('subject') || 'Unsubscribe'
      const body = params.get('body') || 'Please unsubscribe me from this mailing list.'

      const emailLines = [
        `To: ${address}`,
        `Subject: ${subject}`,
        `Content-Type: text/plain; charset=utf-8`,
        `MIME-Version: 1.0`,
        '',
        body,
      ]

      const raw = Buffer.from(emailLines.join('\r\n')).toString('base64url')

      const gmailRes = await fetch(
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ raw }),
          signal: AbortSignal.timeout(8000),
        }
      )

      if (gmailRes.ok) {
        return { method: 'mailto', success: true, address }
      }

      const errData = await gmailRes.json()
      console.warn('Gmail send failed:', errData)
    } catch (err) {
      console.warn('Mailto unsubscribe failed:', err.message)
    }
  }

  // Neither worked — still trash the email, just couldn't unsubscribe
  return { method: 'none', success: false }
}
