export type NavCategory = { id: number; name: string; slug?: string }

export function isBrandsCategory(cat: NavCategory): boolean {
  const slug = (cat.slug ?? '').toLowerCase()
  const name = cat.name.trim().toLowerCase().replace(/ё/g, 'е')
  return slug === 'brands' || name === 'бренды' || name.includes('бренд')
}

/** Разбивка пунктов мега-меню на колонки (как на Farfetch). */
export function splitMegaMenuColumns<T>(items: T[], columnCount = 3): T[][] {
  if (items.length === 0) return []
  const cols = Math.min(columnCount, items.length)
  const perCol = Math.ceil(items.length / cols)
  const result: T[][] = []
  for (let i = 0; i < items.length; i += perCol) {
    result.push(items.slice(i, i + perCol))
  }
  return result
}
