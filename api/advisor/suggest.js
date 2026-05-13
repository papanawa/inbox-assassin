// POST /api/advisor/suggest
// Claude analyzes selected senders and proposes cleanup rules

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { senders } = req.body
  if (!senders?.length) return res.status(400).json({ error: 'No senders provided' })

  const senderList = senders.map(s =>
    `- ${s.name} <${s.email}> | ${s.count} emails | Subjects: ${s.subjects.slice(0, 2).join(' / ') || 'N/A'}`
  ).join('\n')

  const prompt = `You are analyzing Gmail inbox clutter for a user. Based on these senders and their email counts, propose smart cleanup rules.

SENDERS SELECTED FOR CLEANUP:
${senderList}

For each sender, decide the best action:
- "trash" — clearly promotional/spam/unwanted (newsletters, marketing, alerts they don't need)
- "create_and_move" — potentially useful to keep but should be organized (receipts, statements, notifications)
- "mark_read" — low priority but worth keeping (social notifications, updates)

Consider:
- High counts (50+) = almost certainly unwanted if promotional
- Financial/receipt emails = archive/move, not delete
- Social platforms = usually mark_read or trash depending on count
- News/newsletters = usually trash

Respond ONLY with valid JSON array, no markdown, no explanation:
[
  {
    "email": "sender@domain.com",
    "name": "Sender Name",
    "count": 123,
    "rule_name": "Short descriptive rule name",
    "rule_type": "sender",
    "config": { "email": "sender@domain.com" },
    "action": "trash|create_and_move|mark_read",
    "action_config": { "label": "Label name if create_and_move" },
    "reasoning": "One sentence explaining why this action makes sense",
    "description": "Plain English: what this rule will do"
  }
]`

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
        max_tokens: 2048,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await r.json()
    const raw = data.content?.[0]?.text ?? '[]'
    const clean = raw.replace(/```json|```/g, '').trim()
    const proposals = JSON.parse(clean)

    return res.status(200).json({ proposals })
  } catch (err) {
    console.error('Suggest error:', err)
    return res.status(500).json({ error: 'Analysis failed' })
  }
}
