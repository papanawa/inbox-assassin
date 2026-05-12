// Gmail API helpers — all calls go through Vercel serverless functions
// which handle token refresh and auth on the server side.

const BASE = '/api/gmail'

/**
 * List messages matching a query
 * @param {string} accessToken - Gmail OAuth access token
 * @param {string} query - Gmail search query (same syntax as Gmail search bar)
 * @param {string|null} pageToken - Pagination token for next page
 * @param {number} maxResults - Max messages to return (default 500)
 */
export async function listMessages(accessToken, query, pageToken = null, maxResults = 500) {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, query, pageToken, maxResults }),
  })
  if (!res.ok) throw new Error(`Gmail list failed: ${res.statusText}`)
  return res.json()
  // Returns: { messages: [{id, threadId}], nextPageToken, resultSizeEstimate }
}

/**
 * Get count estimate for a query without fetching all messages
 */
export async function estimateCount(accessToken, query) {
  const res = await fetch(`${BASE}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, query, maxResults: 1, estimateOnly: true }),
  })
  if (!res.ok) throw new Error(`Gmail estimate failed: ${res.statusText}`)
  const data = await res.json()
  return data.resultSizeEstimate || 0
}

/**
 * Trash a batch of message IDs
 */
export async function trashMessages(accessToken, messageIds) {
  const res = await fetch(`${BASE}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, messageIds, action: 'trash' }),
  })
  if (!res.ok) throw new Error(`Gmail trash failed: ${res.statusText}`)
  return res.json()
  // Returns: { succeeded: number, failed: number }
}

/**
 * Move messages to a label (create label if needed)
 */
export async function moveMessages(accessToken, messageIds, targetLabel) {
  const res = await fetch(`${BASE}/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accessToken, messageIds, action: 'move', targetLabel }),
  })
  if (!res.ok) throw new Error(`Gmail move failed: ${res.statusText}`)
  return res.json()
}

/**
 * Build a Gmail query string from a rule config
 */
export function buildQuery(rule) {
  switch (rule.rule_type) {
    case 'sender':
      return `from:${rule.config.email}`
    case 'domain':
      return `from:@${rule.config.domain}`
    case 'age':
      return `older_than:${rule.config.older_than_days}d`
    case 'keyword':
      if (!rule.config.keywords?.length) return ''
      if (rule.config.match === 'all') {
        return rule.config.keywords.join(' ')
      }
      return rule.config.keywords.map(k => `"${k}"`).join(' OR ')
    case 'label':
      if (!rule.config.label) return ''
      return `label:${rule.config.label}`
    case 'newsletter':
      return 'list:* OR unsubscribe'
    default:
      return ''
  }
}

/**
 * Format a rule as plain English for UI display
 */
export function ruleToEnglish(rule) {
  switch (rule.rule_type) {
    case 'sender':
      return `All emails from ${rule.config.email}`
    case 'domain':
      return `All emails from @${rule.config.domain}`
    case 'age':
      return `All emails older than ${rule.config.older_than_days} days`
    case 'keyword':
      return `Emails containing: ${rule.config.keywords.join(', ')}`
    case 'label':
      return `All emails labeled "${rule.config.label}"`
    case 'newsletter':
      return `Auto-detected newsletters and subscription emails`
    default:
      return rule.name
  }
}

/**
 * Format bytes to human-readable
 */
export function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function actionToEnglish(action) {
  switch (action) {
    case 'trash':              return 'Delete'
    case 'move':               return 'Move to folder'
    case 'mark_read':          return 'Mark as read'
    case 'unsubscribe_delete': return 'Unsubscribe + Delete'
    case 'create_and_move':    return 'Create folder + Move'
    default:                   return action ?? 'Delete'
  }
}
