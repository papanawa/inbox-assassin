// api/advisor/suggest.js
// Takes selected senders and asks Claude to propose cleanup rules.
// Newsletter senders (hasUnsubscribe=true) get unsubscribe_delete proposed.

const Anthropic = require('@anthropic-ai/sdk').default || require('@anthropic-ai/sdk')

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { senders, existingLabels = [] } = req.body

  if (!senders?.length) {
    return res.status(400).json({ error: 'No senders provided' })
  }

  // Cap at 15 to stay within Vercel Hobby 10s timeout
  const cappedSenders = senders.slice(0, 15)

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const senderDescriptions = cappedSenders.map(s => {
    return [
      `Sender: ${s.name} <${s.email}>`,
      `Email count: ${s.count}`,
      `Sample subjects: ${s.subjects?.join(' | ') || 'none'}`,
      `Supports one-click unsubscribe: ${s.hasUnsubscribe ? 'YES' : 'no'}`,
    ].join('\n')
  }).join('\n\n')

  const labelsList = existingLabels.length
    ? `Existing Gmail labels: ${existingLabels.join(', ')}`
    : 'No existing Gmail labels.'

  const systemPrompt = `You are an email cleanup assistant. Propose Gmail cleanup rules for selected senders.

Available actions:
- trash: Delete emails from this sender
- unsubscribe_delete: Unsubscribe AND delete (ONLY use when "Supports one-click unsubscribe: YES")
- move: Move to an existing label (requires destination_label)
- mark_read: Auto-mark as read
- create_and_move: Create a new label and move there

${labelsList}

Rules:
1. If sender supports one-click unsubscribe, ALWAYS use "unsubscribe_delete"
2. Reuse existing labels when a good match exists
3. Reasoning must be one sentence max
4. Return ONLY valid JSON array, no markdown, no backticks

Response format:
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

target_type: sender, domain, or newsletter
destination_label: required for move/create_and_move, null for all others`

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Propose cleanup rules for these senders:\n\n${senderDescriptions}` }],
    })

    const text = response.content?.[0]?.text || ''
    const cleaned = text.replace(/```json|```/g, '').trim()

    let proposals
    try {
      proposals = JSON.parse(cleaned)
    } catch (e) {
      console.error('Parse error:', text)
      return res.status(200).json({ proposals: [], error: 'Parse error', raw: text })
    }

    if (!Array.isArray(proposals)) {
      return res.status(200).json({ proposals: [], error: 'Not an array' })
    }

    // Enrich proposals with unsubscribe data
    const enriched = proposals.map(rule => {
      const sender = cappedSenders.find(s =>
        s.email === rule.target_value ||
        s.email?.endsWith('@' + rule.target_value)
      )
      if (sender?.hasUnsubscribe && rule.action === 'unsubscribe_delete') {
        return { ...rule, listUnsubscribe: sender.listUnsubscribe, listUnsubscribePost: sender.listUnsubscribePost }
      }
      return rule
    })

    return res.status(200).json({ proposals: enriched })
  } catch (err) {
    console.error('Suggest error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
