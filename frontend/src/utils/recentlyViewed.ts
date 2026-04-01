const RECENTLY_VIEWED_KEY = 'recently_viewed_product_ids'
const DEFAULT_LIMIT = 20

function parseIds(raw: string | null): number[] {
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => Number(item))
      .filter((id) => Number.isInteger(id) && id > 0)
  } catch {
    return []
  }
}

function saveIds(ids: number[]) {
  localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(ids))
}

export function getRecentIds(limit = DEFAULT_LIMIT): number[] {
  const ids = parseIds(localStorage.getItem(RECENTLY_VIEWED_KEY))
  return ids.slice(0, limit)
}

export function pushProductId(productId: number, limit = DEFAULT_LIMIT) {
  const ids = getRecentIds(limit)
  const next = [productId, ...ids.filter((id) => id !== productId)].slice(0, limit)
  saveIds(next)
}
