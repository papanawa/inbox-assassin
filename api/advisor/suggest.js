// api/advisor/suggest.js
// Takes selected senders from inbox scan and asks Claude to propose cleanup rules.
// For senders with hasUnsubscribe=true, proposes unsubscribe_delete action.
// For others, proposes trash, move, or mark_read based on sender patterns.

const Anthropic = require('@anthropic-ai/sdk')

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { senders, existingLabels = [] } = req.body

  if (!senders?.length) {
    return res.status(400).json({ error: 'No senders provided' })
  }

  // Build sender descriptions for Claude
  const senderDescriptions = senders.map(s => {
    const lines = [
      `Sender: ${s.name} <${s.email}>`,
      `Email count: ${s.count}`,
      `Sample subjects: ${s.subjects?.join(' | ') || 'none'}`,
      `Supports one-click unsubscribe: ${s.hasUnsubscribe ? 'YES' : 'no'}`,
    ]
    return lines.join('\n')
  }).join('\n\n')

  const labelsList = existingLabels.length
    ? `Existing Gmail labels: ${existingLabels.join(', ')}`
    : 'No existing Gmail labels.'

  const systemPrompt = `You are an email cleanup assistant. You propose Gmail cleanup rules for selected senders.

Available actions:
- trash: Delete emails from this sender
- unsubscribe_delete: Unsubscribe AND delete (only use when "Supports one-click unsubscribe: YES")
- move: Move to an existing or new label (requires destination_label)
- mark_read: Auto-mark as read without deleting
- create_and_move: Create a new label and move there

${labelsList}

Rules:
1. If a sender supports one-click unsubscribe, ALWAYS propose "unsubscribe_delete" action
2. Reuse existing labels when a good match exists — do not create duplicates
3. Be concise in reasoning (1 sentence)
4. Return ONLY valid JSON — no markdown, no backticks, no explanation

Response format (array of rule objects):
[
  {
    "name": "Short rule name",
    "target_type": "sender",
    "target_value": "email@example.com",
    "action": "unsubscribe_delete",
    "destination_label": null,
    "reasoning": "One sentence why."
  }
]

target_type must be one of: sender, domain, newsletter
If targeting a whole domain, use target_type "domain" and target_value as the domain only (e.g. "example.com")
destination_label is required for move and create_and_move actions, null for all others.`

  const userMessage = `Propose cleanup rules for these senders:\n\n${senderDescriptions}`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    const text = response.content?.[0]?.text || ''

    // Parse JSON — strip any accidental markdown fences
    const cleaned = text.replace(/```json|```/g, '').trim()
    let rules

    try {
      rules = JSON.parse(cleaned)
    } catch (parseErr) {
      console.error('Failed to parse Claude response:', text)
      return res.status(200).json({ rules: [], error: 'Parse error', raw: text })
    }

    if (!Array.isArray(rules)) {
      return res.status(200).json({ rules: [], error: 'Unexpected response shape' })
    }

    // Attach unsubscribe data to rules that need it
    const enriched = rules.map(rule => {
      const sender = senders.find(s =>
        s.email === rule.target_value ||
        s.domain === rule.target_value ||
        s.email?.endsWith(`@${rule.target_value}`)
      )
      if (sender?.hasUnsubscribe && rule.action === 'unsubscribe_delete') {
        return {
          ...rule,
          listUnsubscribe: sender.listUnsubscribe,
          listUnsubscribePost: sender.listUnsubscribePost,
        }
      }
      return rule
    })

    return res.status(200).json({ rules: enriched })
  } catch (err) {
    console.error('Suggest error:', err)
    return res.status(500).json({ error: err.message })
  }
}
