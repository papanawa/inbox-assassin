// api/advisor/suggest.js
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { senders, existingLabels = [] } = req.body
  if (!senders?.length) return res.status(400).json({ error: 'No senders provided' })

  const cappedSenders = senders.slice(0, 15)

  const senderDescriptions = cappedSenders.map(s => [
    `Sender: ${s.name} <${s.email}>`,
    `Email count: ${s.count}`,
    `Sample subjects: ${s.subjects?.join(' | ') || 'none'}`,
    `Supports one-click unsubscribe: ${s.hasUnsubscribe ? 'YES' : 'no'}`,
  ].join('\n')).join('\n\n')

  const labelsList = existingLabels.length
    ? `Existing Gmail labels: ${existingLabels.join(', ')}`
    : 'No existing Gmail labels.'

  const systemPrompt = `You are an email cleanup assistant. Propose Gmail cleanup rules for selected senders.

Available actions:
- trash: Delete emails from this sender
- unsubscribe_delete: Unsubscribe AND delete (ONLY when "Supports one-click unsubscribe: YES")
- move: Move to an existing label (requires action_config.label)
- mark_read: Auto-mark as read
- create_and_move: Create a new label and move there (requires action_config.label)

${labelsList}

Rules:
1. If sender supports one-click unsubscribe, ALWAYS use "unsubscribe_delete"
2. Reuse existing labels when a good match exists
3. reasoning must be one sentence max
4. Return ONLY a valid JSON array — no markdown, no backticks, no explanation

Response format:
[
  {
    "rule_name": "Short rule name",
    "description": "One sentence describing what this rule targets",
    "rule_type": "sender",
    "config": { "value": "email@example.com" },
    "action": "unsubscribe_delete",
    "action_config": { "label": null },
    "reasoning": "One sentence why."
  }
]

rule_type must be one of: sender, domain, newsletter
config.value: the email address, domain, or keyword being targeted
action_config.label: destination label name for move/create_and_move, null for all others`

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
      return res.status(200).json({ proposals: [], error: 'Parse error' })
    }

    if (!Array.isArray(proposals)) {
      return res.status(200).json({ proposals: [], error: 'Not an array' })
    }

    // Enrich with sender count + unsubscribe data
    const enriched = proposals.map(rule => {
      const sender = cappedSenders.find(s =>
        s.email === rule.config?.value ||
        s.email?.endsWith('@' + rule.config?.value)
      )
      const base = { ...rule, count: sender?.count ?? 0 }
      if (sender?.hasUnsubscribe && rule.action === 'unsubscribe_delete') {
        return { ...base, listUnsubscribe: sender.listUnsubscribe, listUnsubscribePost: sender.listUnsubscribePost }
      }
      return base
    })

    return res.status(200).json({ proposals: enriched })
  } catch (err) {
    console.error('Suggest error:', err.message)
    return res.status(500).json({ error: err.message })
  }
}
