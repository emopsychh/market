/** Корни «Для него» / «Для неё» — только переключатель витрины в шапке, не пункты каталога. */
export type CategoryNavItem = { id: number; name: string; slug?: string }

const GENDER_SLUGS = new Set([
  'm',
  'f',
  'muzhchinam',
  'zhenshchinam',
  'мужчинам',
  'женщинам',
  'men',
  'women',
  'dlya-nego',
  'dlya-nee',
  'dlya-neyo',
])

function norm(s: string) {
  return s
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/\s+/g, ' ')
}

export function isGenderShowcaseCategory(cat: CategoryNavItem): boolean {
  const slug = norm(cat.slug ?? '')
  if (slug && (GENDER_SLUGS.has(slug) || slug.includes('muzhchin') || slug.includes('zhenshchin'))) {
    return true
  }

  const name = norm(cat.name)
  if (!name) return false

  if (/^для\s+него$/.test(name) || /^для\s+нее$/.test(name)) return true
  if (name.includes('для него') || name.includes('для нее')) return true
  if (name === 'мужчинам' || name === 'женщинам') return true
  if (/мужчинам/.test(name) && name.length <= 28) return true
  if (/женщинам/.test(name) && name.length <= 28) return true

  return false
}

export function filterNavCategories<T extends CategoryNavItem>(categories: T[]): T[] {
  return categories.filter((c) => !isGenderShowcaseCategory(c))
}
