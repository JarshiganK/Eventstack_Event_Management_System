import { FormEvent, useEffect, useMemo, useState } from 'react'
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
  'Summarize committed costs that still have 0 actual spend.'
]

const PANEL_ANIMATION_MS = 260
const RESPONSE_STYLE_INSTRUCTION =
  'Respond in plain text. Avoid bold, italics, or other decorative formatting. Use a mix of medium-length paragraphs and simple bullet or numbered lists (must). Have 3 line spaces between each sections(must).'

export default function BudgetBot({
  eventId,
  eventTitle,
  eventStartsAt,
  venueName,
  summary,
  items
}: BudgetBotProps) {
  const [open, setOpen] = useState(false)
  const [panelVisible, setPanelVisible] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<BotMessage[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showQuickPrompts, setShowQuickPrompts] = useState(true)

  const snapshot = useMemo(
    () => buildContext({ eventTitle, eventStartsAt, venueName, summary, items }),
    [eventTitle, eventStartsAt, venueName, summary, items]
  )

  async function sendMessage(promptText: string) {
    if (!promptText.trim()) return
    const userMessage: BotMessage = { role: 'user', content: promptText.trim() }
    setShowQuickPrompts(false)
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setError(null)
    setLoading(true)
    try {
      const history = [...messages, userMessage]
      const promptWithGuidance = `${RESPONSE_STYLE_INSTRUCTION}\n\nUser request:\n${promptText.trim()}`
      const { message } = await api.askBudgetBot(eventId, {
        prompt: promptWithGuidance,
        context: snapshot,
        history,
      })
      setMessages(prev => [...prev, { role: 'assistant', content: normalizeAssistantMessage(message) }])
    } catch (err) {
      const description =
        err instanceof Error ? err.message : 'Budget Bot is unavailable. Please try again in a moment.'
      setError(description)
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: 'Unable to generate a response right now. Please try again shortly.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    void sendMessage(input)
  }

  function handleOpen() {
    setPanelVisible(true)
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => setOpen(true))
    } else {
      setTimeout(() => setOpen(true), 0)
    }
  }

  function handleClose() {
    setOpen(false)
  }

  useEffect(() => {
    if (open || !panelVisible) return
    const timeout = window.setTimeout(() => setPanelVisible(false), PANEL_ANIMATION_MS)
    return () => window.clearTimeout(timeout)
  }, [open, panelVisible])

  const stateClass = open ? 'budget-bot--open' : panelVisible ? 'budget-bot--closing' : ''
  const containerClass = ['budget-bot', stateClass].filter(Boolean).join(' ')

  return (
    <div className={containerClass}>
      <button
        type="button"
        className={`budget-bot__launcher${open ? ' budget-bot__launcher--hidden' : ''}`}
        onClick={handleOpen}
        aria-expanded={open}
        aria-controls="budget-bot-panel"
      >
        <span className="budget-bot__launcher-icon" aria-hidden="true">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" role="img">
            <path
              d="M12 3c4.418 0 8 3.134 8 7s-3.582 7-8 7c-.57 0-1.128-.05-1.668-.146L6 19l1.27-2.54C5.254 15.379 4 13.345 4 10s3.582-7 8-7Z"
              fill="url(#botGradient)"
            />
            <path d="M9 10.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm8 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill="#fff" />
            <path d="M9.5 13.25a3.5 3.5 0 0 0 5 0" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" />
            <defs>
              <linearGradient id="botGradient" x1="4" y1="3" x2="20" y2="17" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4f46e5" />
                <stop offset="1" stopColor="#0ea5e9" />
              </linearGradient>
            </defs>
          </svg>
        </span>
        <span className="budget-bot__launcher-copy">
          <span className="budget-bot__launcher-eyebrow">Need a hand?</span>
          <span className="budget-bot__launcher-label">Ask Budget Bot</span>
        </span>
      </button>

      {panelVisible ? (
        <div
          className="budget-bot__panel"
          id="budget-bot-panel"
          role="dialog"
          aria-modal="false"
          aria-label="Budget Bot assistant"
        >
          <header className="budget-bot__header">
            <div>
              <p className="budget-bot__eyebrow">Budget Bot</p>
              <h3>Plan smarter, spend better</h3>
            </div>
            <button type="button" className="budget-bot__close" onClick={handleClose}>
              <span aria-hidden="true">&times;</span>
              <span className="sr-only">Close Budget Bot</span>
            </button>
          </header>

          {showQuickPrompts ? (
            <div className="budget-bot__quick-prompts">
              {quickPrompts.map(prompt => (
                <button
                  type="button"
                  key={prompt}
                  className="budget-bot__prompt"
                  onClick={() => void sendMessage(prompt)}
                  disabled={loading}
                >
                  {prompt}
                </button>
              ))}
            </div>
          ) : null}

          <section
            className={`budget-bot__conversation${
              showQuickPrompts ? '' : ' budget-bot__conversation--expanded'
            }`}
          >
            {messages.length === 0 ? (
              <p className="budget-bot__placeholder">
                Ask me about cash risk, upcoming payments, or anything else about this event. I'll reason over the
                current ledger instantly.
              </p>
            ) : (
              messages.map((message, index) => (
                <article
                  key={`${message.role}-${index}`}
                  className={`budget-bot__message budget-bot__message--${message.role}`}
                >
                  <span className="budget-bot__message-role">{message.role === 'user' ? 'You' : 'Budget Bot'}</span>
                  <p className="budget-bot__message-text">{message.content}</p>
                </article>
              ))
            )}
            {loading ? <p className="budget-bot__typing">Budget Bot is thinking...</p> : null}
            {error ? <p className="error-text">{error}</p> : null}
          </section>

          <form className="budget-bot__input" onSubmit={onSubmit}>
            <input
              type="text"
              placeholder="Ask anything about this event's budget..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" className="btn btn-primary" disabled={loading || !input.trim()}>
              Send
            </button>
          </form>
        </div>
      ) : null}
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

function normalizeAssistantMessage(content: string): string {
  const cleaned = content
    .replace(/\*\*/g, '')
    .replace(/[_`]/g, '')
    .replace(/\r/g, '\n')
    .replace(/\s+\n/g, '\n')
    .replace(/\n\s+/g, '\n')
    .trim()
  return cleaned || content.trim()
}
