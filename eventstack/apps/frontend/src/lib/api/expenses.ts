import { http } from "../http"

export type ExpenseStatus = 'PLANNED' | 'COMMITTED' | 'PAID'

export type ExpensePayload = {
  label: string
  category: string
  vendor?: string | null
  quantity: number
  estimatedCost: number
  actualCost: number
  status: ExpenseStatus
  incurredOn?: string | null
  notes?: string | null
}

export type ExpenseItem = ExpensePayload & {
  id: string
  incurredOn?: string | null
  notes?: string | null
  createdAt?: string | null
  updatedAt?: string | null
}

export type ExpenseSummary = {
  plannedTotal: number
  actualTotal: number
  variance: number
  itemCount: number
  averageActual: number
  byCategory: Array<{ category: string; planned: number; actual: number }>
  byStatus: Array<{ status: string; total: number }>
}

export type EventExpenseResponse = {
  event: { id: string; title: string; startsAt: string; venueName?: string | null }
  items: ExpenseItem[]
  summary: ExpenseSummary
}

export function listEventExpenses(eventId: string) {
  return http<EventExpenseResponse>(`/events/${eventId}/expenses`)
}

export function createEventExpense(eventId: string, payload: ExpensePayload) {
  return http<{ id: string }>(`/events/${eventId}/expenses`, {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export function updateEventExpense(eventId: string, expenseId: string, payload: ExpensePayload) {
  return http<{ id: string }>(`/events/${eventId}/expenses/${expenseId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export function deleteEventExpense(eventId: string, expenseId: string) {
  return http<{ id: string }>(`/events/${eventId}/expenses/${expenseId}`, {
    method: 'DELETE'
  })
}

