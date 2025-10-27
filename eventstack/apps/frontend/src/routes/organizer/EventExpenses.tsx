import { FormEvent, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import BackLink from '../../components/BackLink'
import BudgetBot from '../../components/BudgetBot'
import { api } from '../../lib/api'
import type { ExpenseItem, ExpenseStatus, ExpenseSummary } from '../../lib/api/expenses'

type EventMeta = { id: string; title: string; startsAt?: string; venueName?: string | null }

type ExpenseFormState = {
  label: string
  category: string
  vendor: string
  quantity: string
  estimatedCost: string
  actualCost: string
  status: ExpenseStatus
  incurredOn: string
  notes: string
}

const STATUS_LABELS: Record<ExpenseStatus, string> = {
  PLANNED: 'Planned',
  COMMITTED: 'Committed',
  PAID: 'Paid'
}

const currencyFormatter = new Intl.NumberFormat('en-LK', {
  style: 'currency',
  currency: 'LKR',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2
})

function formatCurrency(value: number | undefined | null) {
  return currencyFormatter.format(value ?? 0)
}

function createInitialFormState(): ExpenseFormState {
  return {
    label: '',
    category: 'Logistics',
    vendor: '',
    quantity: '1',
    estimatedCost: '',
    actualCost: '',
    status: 'PLANNED',
    incurredOn: '',
    notes: ''
  }
}

function resolveErrorMessage(err: unknown, fallback: string) {
  if (err instanceof Error && err.message) {
    try {
      const parsed = JSON.parse(err.message)
      if (parsed?.error) return String(parsed.error)
      if (parsed?.message) return String(parsed.message)
    } catch {
      if (err.message.trim().length) return err.message
    }
  }
  if (typeof err === 'string' && err.trim().length) return err
  return fallback
}

export default function EventExpenses() {
  const { id: eventId } = useParams<{ id: string }>()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState<ExpenseItem[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [eventMeta, setEventMeta] = useState<EventMeta | null>(null)
  const [formState, setFormState] = useState<ExpenseFormState>(() => createInitialFormState())
  const [mode, setMode] = useState<'create' | 'edit'>('create')
  const [editId, setEditId] = useState<string | null>(null)

  useEffect(() => {
    if (!eventId) return
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId])

  async function load() {
    if (!eventId) return
    setLoading(true)
    setError('')
    try {
      const data = await api.listEventExpenses(eventId)
      setItems(data.items)
      setSummary(data.summary)
      setEventMeta(data.event)
    } catch (err) {
      setError(resolveErrorMessage(err, 'Unable to load expenses.'))
    } finally {
      setLoading(false)
    }
  }

  function setField<K extends keyof ExpenseFormState>(field: K, value: string) {
    setFormState(prev => ({ ...prev, [field]: value }))
  }

  function startEdit(expense: ExpenseItem) {
    setMode('edit')
    setEditId(expense.id)
    setFormState({
      label: expense.label,
      category: expense.category,
      vendor: expense.vendor ?? '',
      quantity: String(expense.quantity ?? 1),
      estimatedCost: expense.estimatedCost ? String(expense.estimatedCost) : '',
      actualCost: expense.actualCost ? String(expense.actualCost) : '',
      status: expense.status,
      incurredOn: expense.incurredOn ?? '',
      notes: expense.notes ?? ''
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function resetForm() {
    setMode('create')
    setEditId(null)
    setFormState(createInitialFormState())
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!eventId) return
    setSaving(true)
    setError('')
    const payload = {
      label: formState.label.trim(),
      category: formState.category.trim() || 'General',
      vendor: formState.vendor.trim() || null,
      quantity: Math.max(Number(formState.quantity) || 0, 0),
      estimatedCost: Math.max(Number(formState.estimatedCost) || 0, 0),
      actualCost: Math.max(Number(formState.actualCost) || 0, 0),
      status: formState.status,
      incurredOn: formState.incurredOn ? formState.incurredOn : null,
      notes: formState.notes.trim() ? formState.notes.trim() : null
    }

    try {
      if (mode === 'edit' && editId) {
        await api.updateEventExpense(eventId, editId, payload)
      } else {
        await api.createEventExpense(eventId, payload)
      }
      resetForm()
      await load()
    } catch (err) {
      const fallback = mode === 'edit' ? 'Unable to update expense.' : 'Unable to add expense.'
      setError(resolveErrorMessage(err, fallback))
    } finally {
      setSaving(false)
    }
  }

  async function removeExpense(expenseId: string) {
    if (!eventId) return
    if (!confirm('Remove this expense item?')) return
    try {
      await api.deleteEventExpense(eventId, expenseId)
      if (expenseId === editId) resetForm()
      await load()
    } catch (err) {
      setError(resolveErrorMessage(err, 'Unable to delete expense.'))
    }
  }

  const dateDisplay = useMemo(() => {
    if (!eventMeta?.startsAt) return ''
    const date = new Date(eventMeta.startsAt)
    return Number.isNaN(date.getTime())
      ? ''
      : date.toLocaleString(undefined, {
          dateStyle: 'medium',
          timeStyle: 'short'
        })
  }, [eventMeta])

  return (
    <>
      <div className="page expense-page">
      <BackLink className="mb-4" />

      <section className="expense-header surface-card">
        <div className="expense-header__content">
          <span className="page-eyebrow">Organizer · Expense management</span>
          <h1>{eventMeta?.title ?? 'Event expenses'}</h1>
          <p>Track budget, log vendor commitments and keep spending under control for this event.</p>
          <div className="expense-meta-row">
            <div className="expense-meta-row__item">
              <span className="expense-meta-row__icon" aria-hidden="true">
                {'\u{1F4C5}'}
              </span>
              <div>
                <span className="expense-meta-row__label">Event date</span>
                <span className="expense-meta-row__value">{dateDisplay || 'TBA'}</span>
              </div>
            </div>
            <div className="expense-meta-row__item">
              <span className="expense-meta-row__icon" aria-hidden="true">
                {'\u{1F4CD}'}
              </span>
              <div>
                <span className="expense-meta-row__label">Venue</span>
                <span className="expense-meta-row__value">{eventMeta?.venueName || 'TBA'}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {summary ? (
        <section className="expense-summary">
          <div className="expense-summary-grid">
            <article className="stat-tile expense-stat-card expense-stat-card--planned">
              <span className="stat-tile__label">Planned spend</span>
              <span className="stat-tile__value">{formatCurrency(summary.plannedTotal)}</span>
              <span className="stat-tile__delta expense-stat-note">
                Across {summary.itemCount} {summary.itemCount === 1 ? 'item' : 'items'}
              </span>
            </article>
            <article className="stat-tile expense-stat-card expense-stat-card--actual">
              <span className="stat-tile__label">Actual spend</span>
              <span className="stat-tile__value">{formatCurrency(summary.actualTotal)}</span>
              <span className="stat-tile__delta expense-stat-note">
                Avg {formatCurrency(summary.averageActual || 0)} / item
              </span>
            </article>
            <article
              className={`stat-tile expense-stat-card expense-stat-card--variance ${
                summary.variance > 0 ? 'is-over' : 'is-under'
              }`}
            >
              <span className="stat-tile__label">Variance</span>
              <span className="stat-tile__value">{formatCurrency(summary.variance)}</span>
              <span className="stat-tile__delta expense-stat-note">
                {summary.variance > 0 ? 'Over budget' : 'Under budget'}
              </span>
            </article>
            <article className="stat-tile expense-stat-card expense-stat-card--paid">
              <span className="stat-tile__label">Paid</span>
              <span className="stat-tile__value">
                {formatCurrency(summary.byStatus.find(s => s.status === 'PAID')?.total || 0)}
              </span>
              <span className="stat-tile__delta expense-stat-note">Marked as paid</span>
            </article>
          </div>

          {summary.byCategory.length || summary.byStatus.length ? (
            <div className="expense-breakdown surface-card">
              {summary.byCategory.length ? (
                <div>
                  <h3>By category</h3>
                  <ul>
                    {summary.byCategory.map(category => {
                      const utilization =
                        category.planned > 0 ? Math.min((category.actual / category.planned) * 100, 120) : 0
                      return (
                        <li key={category.category} className="expense-breakdown__item">
                          <div className="expense-breakdown__row">
                            <span className="expense-chip__label">{category.category}</span>
                            <span className="expense-chip__value">
                              {formatCurrency(category.actual)} / {formatCurrency(category.planned)}
                            </span>
                          </div>
                          <div className="expense-breakdown__bar">
                            <span
                              className={`expense-breakdown__bar-fill${
                                utilization > 100 ? ' is-over' : ''
                              }`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              ) : null}
              {summary.byStatus.length ? (
                <div>
                  <h3>By status</h3>
                  <ul>
                    {summary.byStatus.map(status => (
                      <li
                        key={status.status}
                        className={`expense-breakdown__item expense-breakdown__item--status expense-breakdown__item--${status.status.toLowerCase()}`}
                      >
                        <span className="expense-status-pill">
                          {STATUS_LABELS[status.status as ExpenseStatus] ?? status.status}
                        </span>
                        <span className="expense-chip__value">{formatCurrency(status.total)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </section>
      ) : null}

      <section className="expense-table surface-card">
        <div className="section-heading">
          <h2>Expense ledger</h2>
          <p className="section-heading__sub">
            Maintain a running list of commitments, invoices and payments tied to this event.
          </p>
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => void load()}>
            Refresh
          </button>
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        {loading ? (
          <div className="loading">Loading expenses...</div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No expenses yet</h3>
            <p>Start logging vendor quotes or confirmed costs to track profitability.</p>
          </div>
        ) : (
          <div className="expense-table__scroll">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Category</th>
                  <th>Quantity</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th aria-label="actions" />
                </tr>
              </thead>
              <tbody>
                {items.map(item => {
                  const overBudget = (item.actualCost || 0) > (item.estimatedCost || 0)
                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="expense-item__title">{item.label}</div>
                        {item.vendor ? <div className="expense-item__meta">{item.vendor}</div> : null}
                        {item.notes ? <p className="expense-item__notes">{item.notes}</p> : null}
                      </td>
                      <td>{item.category}</td>
                      <td>{item.quantity ?? '-'}</td>
                      <td className="expense-amount expense-amount--planned">{formatCurrency(item.estimatedCost)}</td>
                      <td
                        className={`expense-amount expense-amount--actual${
                          overBudget ? ' expense-amount--over' : ''
                        }`}
                      >
                        {formatCurrency(item.actualCost)}
                      </td>
                      <td>
                        <span className={`expense-status expense-status--${item.status.toLowerCase()}`}>
                          {STATUS_LABELS[item.status]}
                        </span>
                      </td>
                      <td>{item.incurredOn || '—'}</td>
                      <td>
                        <div className="btn-group">
                          <button type="button" className="btn btn-ghost btn-sm" onClick={() => startEdit(item)}>
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            onClick={() => void removeExpense(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="expense-form surface-card">
        <div className="section-heading">
          <h2>{mode === 'edit' ? 'Update expense' : 'Add expense'}</h2>
          {mode === 'edit' ? (
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm}>
              Cancel edit
            </button>
          ) : null}
        </div>
        <form className="expense-form__grid" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>Expense label</span>
            <input
              className="form-input"
              value={formState.label}
              onChange={e => setField('label', e.target.value)}
              placeholder="e.g. Catering invoice"
              required
            />
          </label>
          <label className="form-field">
            <span>Category</span>
            <input
              className="form-input"
              value={formState.category}
              onChange={e => setField('category', e.target.value)}
              placeholder="Logistics, Marketing..."
              required
            />
          </label>
          <label className="form-field">
            <span>Vendor / partner</span>
            <input
              className="form-input"
              value={formState.vendor}
              onChange={e => setField('vendor', e.target.value)}
              placeholder="Optional"
            />
          </label>
          <label className="form-field">
            <span>Quantity</span>
            <input
              className="form-input"
              type="number"
              min="0"
              step="1"
              value={formState.quantity}
              onChange={e => setField('quantity', e.target.value)}
            />
          </label>
          <label className="form-field">
            <span>Planned cost</span>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              value={formState.estimatedCost}
              onChange={e => setField('estimatedCost', e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="form-field">
            <span>Actual cost</span>
            <input
              className="form-input"
              type="number"
              min="0"
              step="0.01"
              value={formState.actualCost}
              onChange={e => setField('actualCost', e.target.value)}
              placeholder="0.00"
            />
          </label>
          <label className="form-field">
            <span>Status</span>
            <select className="form-input" value={formState.status} onChange={e => setField('status', e.target.value)}>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="form-field">
            <span>Incurred on</span>
            <input
              className="form-input"
              type="date"
              value={formState.incurredOn}
              onChange={e => setField('incurredOn', e.target.value)}
            />
          </label>
          <label className="form-field form-field--full">
            <span>Notes</span>
            <textarea
              className="form-input form-input--textarea"
              rows={3}
              value={formState.notes}
              onChange={e => setField('notes', e.target.value)}
              placeholder="Contracts, payment terms or other details"
            />
          </label>

          <div className="expense-form__actions">
            <button type="submit" className="btn btn-primary btn-lg" disabled={saving}>
              {saving ? 'Saving...' : mode === 'edit' ? 'Update expense' : 'Add expense'}
            </button>
            {mode === 'edit' ? (
              <button type="button" className="btn btn-outline btn-lg" onClick={resetForm}>
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </div>
      {eventId ? (
        <BudgetBot
          eventId={eventId}
          eventTitle={eventMeta?.title}
          eventStartsAt={eventMeta?.startsAt}
          venueName={eventMeta?.venueName}
          summary={summary}
          items={items}
        />
      ) : null}
    </>
  )
}



