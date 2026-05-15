import type { ProductListParams } from '../api'
import type { ShopGender } from '../contexts/ShopGenderContext'

/** Параметры списка товаров: витрина по полу + категория/поиск/бренд (пересечение на бэкенде). */
export function buildProductListParams(options: {
  shopGender: ShopGender | null
  search?: string
  categoryId?: string
  brand?: string
}): ProductListParams | undefined {
  const params: ProductListParams = {}

  const search = options.search?.trim()
  if (search) params.search = search

  if (options.categoryId) {
    const parsed = parseInt(options.categoryId, 10)
    if (!Number.isNaN(parsed)) params.category = parsed
  }

  if (options.brand) params.brand = options.brand

  if (options.shopGender) params.shop_gender = options.shopGender

  return Object.keys(params).length > 0 ? params : undefined
}
