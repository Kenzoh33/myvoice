const REFLECTIONS_KEY = 'myvoice_reflections'

// Reflections are bucketed by taxonomy `categoryKey`, never by the free text the student
// typed. Previously "extra time" and "more time on tests" were two separate histories, so
// a student's record silently fragmented every time they rephrased themselves — which is
// exactly what a K-12 student does. Entries written before this change have no categoryKey,
// so we fall back to matching on the need string for them.

export function getReflections() {
  try {
    const raw = window.localStorage.getItem(REFLECTIONS_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function getReflectionsFor({ categoryKey, need }) {
  return getReflections().filter((entry) => {
    if (categoryKey && entry.categoryKey) return entry.categoryKey === categoryKey
    return entry.need === need
  })
}

export function addReflection(entry) {
  const updated = [...getReflections(), entry]
  try {
    window.localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(updated))
  } catch (err) {
    // Quota or private-mode failure — the reflection still shows this session.
    console.warn('Could not save reflection locally:', err)
  }
  return updated
}

export function clearReflections() {
  try {
    window.localStorage.removeItem(REFLECTIONS_KEY)
  } catch {
    /* nothing useful to do */
  }
}

// Oldest-first feeling scores, for the trend view. Only entries that actually recorded
// a feeling count — a missing rating is not a zero.
export function feelingSeries(entries) {
  return [...entries]
    .filter((e) => Number.isFinite(e.feeling) && e.feeling > 0)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .map((e) => ({ value: e.feeling, createdAt: e.createdAt }))
}
