// POST /api/rules/parse
// Parses a natural language cleanup instruction into a structured rule

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { text } = req.body
  if (!text?.trim()) return res.status(400).json({ error: 'No text provided' })

  const prompt = `Parse this Gmail cleanup instruction into a structured rule. Respond ONLY with valid JSON, no markdown, no explanation.

Instruction: "${text}"

Return this exact JSON structure:
{
  "name": "short descriptive rule name",
  "rule_type": "sender|domain|age|keyword|label|newsletter",
  "config": {
    "email": "...",        // sender only
    "domain": "...",       // domain only
    "older_than_days": 90, // age only
    "keywords": ["..."],   // keyword only
    "match": "any",        // keyword only: "any" or "all"
    "label": "..."         // label only
  },
  "action": "trash|move|mark_read|unsubscribe_delete|create_and_move",
  "action_config": {
    "label": "optional label name for move or create_and_move"
  },
  "description": "Plain English: exactly what this rule will do"
}`

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
        max_tokens: 512,
        messages: [{ role: 'user', content: prompt }],
      }),
    })

    const data = await r.json()
    const raw = data.content?.[0]?.text ?? '{}'
    const clean = raw.replace(/```json|```/g, '').trim()
    const rule = JSON.parse(clean)
    return res.status(200).json({ rule })
  } catch (err) {
    console.error('Parse error:', err)
    return res.status(500).json({ error: 'Could not parse instruction' })
  }
}
