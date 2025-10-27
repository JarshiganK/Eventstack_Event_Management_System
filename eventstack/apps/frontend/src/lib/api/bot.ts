import { http } from "../http"

export type BotMessage = { role: "user" | "assistant"; content: string }

export async function askBudgetBot(eventId: string, payload: { prompt: string; context: string; history?: BotMessage[] }) {
  return http<{ message: string }>(`/events/${eventId}/budget-bot`, {
    method: "POST",
    body: JSON.stringify(payload)
  })
}
