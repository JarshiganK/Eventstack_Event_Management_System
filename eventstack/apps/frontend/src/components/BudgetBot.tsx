import { FormEvent, useMemo, useState } from 'react'
import { api } from '../lib/api'
import type { ExpenseItem, ExpenseSummary } from '../lib/api/expenses'
import type { BotMessage } from '../lib/api/bot'

type BudgetBotProps = {
  eventId: string
  eventTitle?: string
  eventStartsAt?: string
  venueName?: string | null
  summary: ExpenseSummary | null
  items: ExpenseItem[]
}

const quickPrompts = [
  'What are my largest spending risks?',
  'Which payments should I prioritize next?',
  'Explain the variance between planned and actual spend.',
  'Summarize all committed costs that still have zero actual spend.'
]

export default function BudgetBot({
  eventId,
  eventTitle,
  eventStartsAt,
  venueName,
  summary,
  items
}: BudgetBotProps) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<BotMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const snapshot = useMemo(() => buildContext({ eventTitle, eventStartsAt, venueName, summary, items }), [
    eventTitle,
    eventStartsAt,
    venueName,
    summary,
    items,
  ])

  async function sendMessage(promptText: string) {
    if (!promptText.trim()) return
    const userMessage: BotMessage = { role: 'user', content: promptText.trim() }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setError(null)
    setLoading(true)
    try {
      const history = [...messages, userMessage]
      const { message } = await api.askBudgetBot(eventId, {
        prompt: promptText.trim(),
        context: snapshot,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: message }])
    } catch (err) {
      const description =
        err instanceof Error ? err.message : 'Budget Bot is unavailable. Please try again in a moment.'
      setError(description)
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Unable to generate a response right now.' }])
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void sendMessage(input)
  }

  return (
    <div className={`budget-bot${open ? ' budget-bot--open' : ''}`}>
      {open ? (
        <div className="budget-bot__panel surface-card">
          <header className="budget-bot__header">
            <div>
              <p className="budget-bot__eyebrow">Budget Bot</p>
              <h3>Need a second opinion?</h3>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </header>

          <div className="budget-bot__quick-prompts">
            {quickPrompts.map(prompt => (
              <button
                type="button"
                key={prompt}
                className="chip"
                onClick={() => void sendMessage(prompt)}
                disabled={loading}
              >
                {prompt}
              </button>
            ))}
          </div>

          <section className="budget-bot__conversation">
            {messages.length === 0 ? (
              <p className="budget-bot__placeholder">
                Ask me about cash risk, upcoming payments, or anything else about this event. I’ll reason over the
                current ledger instantly.
              </p>
            ) : (
              messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`budget-bot__message budget-bot__message--${message.role}`}
                >
                  <span className="budget-bot__message-role">{message.role === 'user' ? 'You' : 'Budget Bot'}</span>
                  <p>{message.content}</p>
                </article>
              ))
            )}
            {loading ? <p className="budget-bot__typing">Budget Bot is thinking…</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>

          <form className="budget-bot__input" onSubmit={onSubmit}>
            <input
              type="text"
              placeholder="Ask anything about this event’s budget…"
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : (
        <button type="button" className="budget-bot__toggle" onClick={() => setOpen(true)}>
          <span>Budget Bot</span>
        </button>
      )}
    </div>
  )
}

function buildContext({
  eventTitle,
  eventStartsAt,
  venueName,
  summary,
  items,
}: {
  eventTitle?: string
  eventStartsAt?: string
  venueName?: string | null
  summary: ExpenseSummary | null
  items: ExpenseItem[]
}) {
  const lines: string[] = []
  lines.push(`Event: ${eventTitle || 'Untitled event'}`)
  if (eventStartsAt) lines.push(`Starts at: ${eventStartsAt}`)
  if (venueName) lines.push(`Venue: ${venueName}`)

  if (summary) {
    lines.push(
      `Planned spend: LKR ${formatNumber(summary.plannedTotal)}, Actual spend: LKR ${formatNumber(
        summary.actualTotal
      )}, Variance: LKR ${formatNumber(summary.variance)}`
    )
    lines.push(`Items tracked: ${summary.itemCount}, Average actual per item: LKR ${formatNumber(summary.averageActual)}`)
  }

  lines.push('Ledger items:')
  items.forEach(item => {
    lines.push(
      `- ${item.label} | Category: ${item.category} | Planned LKR ${formatNumber(item.estimatedCost)} | Actual LKR ${formatNumber(
        item.actualCost
      )} | Status: ${item.status}${item.vendor ? ` | Vendor: ${item.vendor}` : ''}${
        item.notes ? ` | Notes: ${item.notes}` : ''
      }`
    )
  })

  return lines.join('\n')
}

function formatNumber(value?: number | null) {
  if (value === undefined || value === null) return '0'
  return new Intl.NumberFormat('en-LK', { maximumFractionDigits: 0 }).format(value)
}

