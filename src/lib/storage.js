const REFLECTIONS_KEY = 'myvoice_reflections'

export function getReflections() {
  try {
    const raw = window.localStorage.getItem(REFLECTIONS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function getReflectionsForNeed(need) {
  return getReflections().filter((entry) => entry.need === need)
}

export function addReflection(entry) {
  const updated = [...getReflections(), entry]
  window.localStorage.setItem(REFLECTIONS_KEY, JSON.stringify(updated))
  return updated
}
