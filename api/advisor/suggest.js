// POST /api/advisor/suggest
// Claude analyzes selected senders and proposes cleanup rules
// Accepts existing Gmail labels to avoid creating duplicates

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { senders, existingLabels = [] } = req.body
  if (!senders?.length) return res.status(400).json({ error: 'No senders provided' })

  const senderList = senders.map(s =>
    `- ${s.name} <${s.email}> | ${s.count} emails | Subjects: ${s.subjects.slice(0, 2).join(' / ') || 'N/A'}`
  ).join('\n')

  const labelList = existingLabels.length > 0
    ? `\nEXISTING GMAIL LABELS (reuse these instead of creating new ones):\n${existingLabels.map(l => `- ${l}`).join('\n')}`
    : ''

  const prompt = `You are analyzing Gmail inbox clutter. Propose smart cleanup rules for these senders.
${labelList}

SENDERS TO CLEAN:
${senderList}

Rules:
- "trash" = promotional/spam/marketing/newsletters
- "create_and_move" = useful to keep but should be organized (receipts, statements, financial, medical, orders)
- "mark_read" = low priority but worth keeping

IMPORTANT: If existing labels are provided above, use them for folder names instead of creating new ones. Pick the most appropriate existing label. Only suggest a new label name if none of the existing ones fit.

For financial emails: prefer existing Finance or Banking labels.
For order/receipt emails: prefer existing Orders or Receipts labels.
High email counts (50+) from promotional senders = trash.

Respond ONLY with valid JSON array, no markdown:
[
  {
    "email": "sender@domain.com",
    "name": "Sender Name",
    "count": 123,
    "rule_name": "Short descriptive name",
    "rule_type": "sender",
    "config": { "email": "sender@domain.com" },
    "action": "trash|create_and_move|mark_read",
    "action_config": { "label": "Exact existing label name or new name" },
    "reasoning": "One sentence why",
    "description": "Plain English: what this rule does"
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
