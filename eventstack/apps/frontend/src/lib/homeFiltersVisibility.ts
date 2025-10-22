const HOME_CATEGORY_FILTERS_VISIBILITY_STORAGE_KEY = 'home:categoryFiltersVisible'
const HOME_CATEGORY_FILTERS_VISIBILITY_EVENT = 'homeCategoryFiltersVisibilityChanged'

function isBrowser() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

function parseVisibility(value: string | null, fallback = true) {
  if (value === null) return fallback
  return value !== 'false'
}

export function getHomeCategoryFiltersVisible(defaultValue = true) {
  if (!isBrowser()) return defaultValue
  return parseVisibility(window.localStorage.getItem(HOME_CATEGORY_FILTERS_VISIBILITY_STORAGE_KEY), defaultValue)
}

export function setHomeCategoryFiltersVisible(visible: boolean) {
  if (!isBrowser()) return
  window.localStorage.setItem(
    HOME_CATEGORY_FILTERS_VISIBILITY_STORAGE_KEY,
    visible ? 'true' : 'false'
  )
  window.dispatchEvent(
    new CustomEvent(HOME_CATEGORY_FILTERS_VISIBILITY_EVENT, { detail: { value: visible } })
  )
}

export const HOME_CATEGORY_FILTERS_VISIBILITY = {
  STORAGE_KEY: HOME_CATEGORY_FILTERS_VISIBILITY_STORAGE_KEY,
  EVENT: HOME_CATEGORY_FILTERS_VISIBILITY_EVENT,
}

