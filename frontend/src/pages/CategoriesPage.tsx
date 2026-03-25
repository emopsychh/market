import { useEffect, useState } from 'react'
import { categoriesApi } from '../api'
import { CategoryCard, type Category } from '../components/CategoryCard/CategoryCard'
import styles from './CategoriesPage.module.css'

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    categoriesApi
      .list()
      .then((res) => setCategories(res.data.results ?? res.data ?? []))
      .catch((err) => setError(err.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="container">
      <h1 className={styles.title}>/categories 類別</h1>

      {loading && <p className={styles.placeholder}>Загрузка...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && categories.length === 0 && (
        <p className={styles.placeholder}>Категории пока не добавлены</p>
      )}

      {!loading && !error && categories.length > 0 && (
        <div className={styles.grid}>
          {categories.map((category, index) => (
            <CategoryCard key={category.id} category={category} index={index} />
          ))}
        </div>
      )}
    </div>
  )
}
