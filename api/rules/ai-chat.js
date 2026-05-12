// POST /api/rules/ai-chat
// AI conversation endpoint for rule creation via Claude

const SYSTEM = `You are the Inbox Assassin AI assistant — a sharp, efficient email cleanup advisor.

Your job: have a brief conversation (2-3 exchanges max) to understand what the user wants cleaned up, then propose specific rules.

Available rule types:
- sender: Target a specific email address
- domain: Target all emails from a domain (e.g. @groupon.com)
- age: Target emails older than X days
- keyword: Target emails containing specific words/phrases
- label: Target emails with a specific Gmail label
- newsletter: Auto-detect newsletter and subscription emails

Available actions:
- trash: Move to Gmail Trash (recoverable for 30 days)
- move: Move to an existing Gmail label
- mark_read: Mark all matching emails as read
- unsubscribe_delete: Unsubscribe from mailing list + trash
- create_and_move: Create a new label/folder and move emails there

Style:
- Be concise and direct. No fluff.
- Ask ONE clarifying question at a time if needed.
- If the user's intent is clear, skip straight to proposing rules.
- Use plain English, not technical jargon.

When ready to propose rules, end your message with a <rules> block containing valid JSON:

<rules>
[
  {
    "name": "Rule name",
    "rule_type": "sender|domain|age|keyword|label|newsletter",
    "config": {
      "email": "...",
      "domain": "...",
      "older_than_days": 90,
      "keywords": ["..."],
      "match": "any",
      "label": "..."
    },
    "action": "trash|move|mark_read|unsubscribe_delete|create_and_move",
    "action_config": { "label": "optional label name" },
    "description": "Plain English description of what this rule does"
  }
]
</rules>`

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages } = req.body
  if (!messages?.length) return res.status(400).json({ error: 'No messages' })

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: SYSTEM,
        messages,
      }),
    })

    const data = await r.json()
    const reply = data.content?.[0]?.text ?? ''

    // Extract proposed rules if present
    const rulesMatch = reply.match(/<rules>([\s\S]*?)<\/rules>/)
    let proposedRules = null
    if (rulesMatch) {
      try {
        proposedRules = JSON.parse(rulesMatch[1].trim())
      } catch { /* malformed JSON */ }
    }

    // Clean reply text (remove the rules block)
    const cleanReply = reply.replace(/<rules>[\s\S]*?<\/rules>/, '').trim()

    return res.status(200).json({ reply: cleanReply, proposedRules })
  } catch (err) {
    console.error('AI chat error:', err)
    return res.status(500).json({ error: 'AI chat failed' })
  }
}
