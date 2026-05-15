import { categoriesApi } from '../api'
import {
  isGenderShowcaseCategory,
  type CategoryNavItem,
} from './isGenderShowcaseCategory'

export type ProductCategoryOption = { id: number; label: string }

function norm(s: string) {
  return s
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
}

export function isMaleGenderRoot(cat: CategoryNavItem): boolean {
  const slug = norm(cat.slug ?? '')
  if (slug === 'm' || slug === 'muzhchinam' || slug === 'men' || slug === 'dlya-nego') return true
  const name = norm(cat.name)
  return name === 'для него' || name === 'мужчинам'
}

export function isFemaleGenderRoot(cat: CategoryNavItem): boolean {
  const slug = norm(cat.slug ?? '')
  if (slug === 'f' || slug === 'zhenshchinam' || slug === 'women' || slug === 'dlya-nee' || slug === 'dlya-neyo') {
    return true
  }
  const name = norm(cat.name)
  return name === 'для нее' || name === 'женщинам'
}

function genderRootMatchesVitrine(
  root: CategoryNavItem,
  gender: 'male' | 'female' | 'unisex',
): boolean {
  if (gender === 'male') return isMaleGenderRoot(root)
  if (gender === 'female') return isFemaleGenderRoot(root)
  return isMaleGenderRoot(root) || isFemaleGenderRoot(root)
}

/** Категории для формы товара: без корней витрины, с учётом выбранного пола. */
export async function loadProductCategoryOptions(
  gender: 'male' | 'female' | 'unisex',
): Promise<ProductCategoryOption[]> {
  const rootsRes = await categoriesApi.list()
  const roots = (rootsRes.data.results ?? rootsRes.data ?? []) as CategoryNavItem[]
  const options: ProductCategoryOption[] = []
  const usePrefix = gender === 'unisex'

  for (const root of roots) {
    const subRes = await categoriesApi.list({ parent: root.id })
    const children = (subRes.data.results ?? subRes.data ?? []) as CategoryNavItem[]

    if (isGenderShowcaseCategory(root)) {
      if (!genderRootMatchesVitrine(root, gender)) continue

      const prefix = isMaleGenderRoot(root) ? 'Мужское' : isFemaleGenderRoot(root) ? 'Женское' : root.name

      for (const child of children) {
        if (isGenderShowcaseCategory(child)) continue
        options.push({
          id: child.id,
          label: usePrefix ? `${prefix} — ${child.name}` : child.name,
        })
      }
      continue
    }

    if (children.length === 0) {
      options.push({ id: root.id, label: root.name })
    } else {
      for (const child of children) {
        if (isGenderShowcaseCategory(child)) continue
        options.push({ id: child.id, label: child.name })
      }
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'ru'))
}

export function resolveCategoryId(
  categoryId: string,
  options: ProductCategoryOption[],
): string {
  if (!options.length) return ''
  const id = parseInt(categoryId, 10)
  if (!Number.isNaN(id) && options.some((o) => o.id === id)) {
    return String(id)
  }
  return String(options[0].id)
}
