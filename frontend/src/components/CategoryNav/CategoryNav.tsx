import { useEffect, useState, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { categoriesApi } from '../../api'
import styles from './CategoryNav.module.css'

export interface CategoryItem {
  id: number
  name: string
  slug: string
  parent: number | null
  order: number
}

export function CategoryNav() {
  const [parents, setParents] = useState<CategoryItem[]>([])
  const [children, setChildren] = useState<CategoryItem[]>([])
  const [activeParentId, setActiveParentId] = useState<number | null>(null)
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    categoriesApi
      .list()
      .then((res) => setParents(res.data.results ?? res.data ?? []))
      .catch(() => setParents([]))
  }, [])

  const loadChildren = useCallback((parentId: number) => {
    categoriesApi
      .list({ parent: parentId })
      .then((res) => setChildren(res.data.results ?? res.data ?? []))
      .catch(() => setChildren([]))
  }, [])

  const handleParentClick = (cat: CategoryItem) => {
    setActiveParentId(cat.id)
    loadChildren(cat.id)
  }

  const goToProducts = (cat: CategoryItem) => {
    setActiveCategoryId(cat.id)
    navigate(
      `/products?category=${cat.id}&category_name=${encodeURIComponent(cat.name)}`
    )
  }

  // Синхронизация с URL только на странице каталога (в т.ч. вложенные категории)
  useEffect(() => {
    if (location.pathname !== '/products') return

    const params = new URLSearchParams(location.search)
    const catIdStr = params.get('category')
    if (!catIdStr) {
      setActiveCategoryId(null)
      setActiveParentId(null)
      setChildren([])
      return
    }

    const id = parseInt(catIdStr, 10)
    if (Number.isNaN(id)) return

    let cancelled = false
    categoriesApi
      .detail(id)
      .then(({ data }) => {
        if (cancelled) return
        setActiveCategoryId(id)
        if (data.parent) {
          setActiveParentId(data.parent)
          loadChildren(data.parent)
        } else {
          setActiveParentId(id)
          loadChildren(id)
        }
      })
      .catch(() => {})

    return () => {
      cancelled = true
    }
  }, [location.pathname, location.search, loadChildren])

  if (parents.length === 0) return null

  return (
    <div className={styles.wrap} lang="ru">
      <div className={styles.primary}>
        {parents.map((cat) => (
          <button
            key={cat.id}
            type="button"
            className={
              activeParentId === cat.id ? styles.primaryActive : styles.primaryBtn
            }
            onClick={() => handleParentClick(cat)}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {activeParentId !== null && children.length > 0 && (
        <div className={styles.secondary}>
          {children.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={
                activeCategoryId === cat.id ? styles.secondaryActive : styles.secondaryBtn
              }
              onClick={() => goToProducts(cat)}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {activeParentId !== null && children.length === 0 && (
        <div className={styles.secondary}>
          <button
            type="button"
            className={
              activeCategoryId === activeParentId ? styles.secondaryActive : styles.secondaryBtn
            }
            onClick={() => {
              const p = parents.find((x) => x.id === activeParentId)
              if (p) goToProducts(p)
            }}
          >
            Все товары в категории
          </button>
        </div>
      )}
    </div>
  )
}
