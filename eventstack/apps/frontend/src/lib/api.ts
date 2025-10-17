import * as auth from "./api/auth"
import * as events from "./api/events"
import * as venues from "./api/venues"
import * as misc from "./api/misc"

export const api = {
  // auth
  login: auth.login,
  register: auth.register,
  me: auth.me,

  // venues
  listVenues: venues.listVenues,
  createVenue: venues.createVenue,
  updateVenue: venues.updateVenue,
  deleteVenue: venues.deleteVenue,

  // events
  listEvents: events.listEvents,
  getEvent: events.getEvent,
  createEvent: events.createEvent,
  updateEvent: events.updateEvent,
  deleteEvent: events.deleteEvent,

  // misc
  listBookmarks: misc.listBookmarks,
  addBookmark: misc.addBookmark,
  removeBookmark: misc.removeBookmark,
  uploadFile: misc.uploadFile,
  search: misc.search,
  notifications: misc.notifications,
}

