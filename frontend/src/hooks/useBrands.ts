import { useEffect, useState } from 'react'
import { brandsApi, type Brand } from '../api'

let cachedBrands: Brand[] | null = null
let fetchPromise: Promise<Brand[]> | null = null

async function loadBrands(): Promise<Brand[]> {
  if (cachedBrands) return cachedBrands
  if (!fetchPromise) {
    fetchPromise = brandsApi
      .list()
      .then((res) => {
        const data = res.data
        const list = (Array.isArray(data) ? data : data.results ?? []) as Brand[]
        cachedBrands = list.filter((b) => typeof b?.slug === 'string' && typeof b?.name === 'string')
        return cachedBrands
      })
      .catch(() => {
        cachedBrands = []
        return cachedBrands
      })
      .finally(() => {
        fetchPromise = null
      })
  }
  return fetchPromise
}

export function invalidateBrandsCache() {
  cachedBrands = null
}

export function useBrands() {
  const [brands, setBrands] = useState<Brand[]>(cachedBrands ?? [])
  const [loading, setLoading] = useState(!cachedBrands)

  useEffect(() => {
    let cancelled = false
    void loadBrands().then((list) => {
      if (!cancelled) {
        setBrands(list)
        setLoading(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  const nameBySlug = brands.reduce<Record<string, string>>((acc, b) => {
    acc[b.slug] = b.name
    return acc
  }, {})

  return { brands, loading, nameBySlug }
}
