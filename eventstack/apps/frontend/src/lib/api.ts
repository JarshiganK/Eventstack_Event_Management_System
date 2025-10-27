import * as auth from "./api/auth"
import * as events from "./api/events"
import * as expenses from "./api/expenses"
import * as bot from "./api/bot"
// venues API removed - events store venue_name directly
import * as misc from "./api/misc"
import * as admin from "./api/admin"

export const api = {
  // auth
  login: auth.login,
  register: auth.register,
  me: auth.me,

  // venues: removed — events now store venueName directly

  // events
  listEvents: events.listEvents,
  getEvent: events.getEvent,
  createEvent: events.createEvent,
  updateEvent: events.updateEvent,
  deleteEvent: events.deleteEvent,
  addEventImage: events.addEventImage,
  listEventExpenses: expenses.listEventExpenses,
  createEventExpense: expenses.createEventExpense,
  updateEventExpense: expenses.updateEventExpense,
  deleteEventExpense: expenses.deleteEventExpense,
  askBudgetBot: bot.askBudgetBot,

  // misc
  listBookmarks: misc.listBookmarks,
  addBookmark: misc.addBookmark,
  removeBookmark: misc.removeBookmark,
  uploadFile: misc.uploadFile,
  search: misc.search,
  notifications: misc.notifications,

  // admin
  getAnalytics: admin.getAnalytics,
  listUsers: admin.listUsers,
  listOrganizers: admin.listOrganizers,
  updateUserRole: admin.updateUserRole,
  updateUserStatus: admin.updateUserStatus,
  deleteUser: admin.deleteUser,
}
