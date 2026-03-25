import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import styles from './ProductsPage.module.css'

export function ProductsPage() {
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const categoryName = searchParams.get('category_name') ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params: { search?: string; category?: number } = {}
    if (search) params.search = search
    if (categoryId) params.category = parseInt(categoryId, 10)
    productsApi
      .list(Object.keys(params).length ? params : undefined)
      .then((res) => setProducts(res.data.results ?? res.data))
      .catch((err) => setError(err.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [search, categoryId])

  return (
    <div className="container">
      <h1 className={styles.title}>
        /products
        {search && <span className={styles.query}> — «{search}»</span>}
        {categoryId && !search && (
          <span className={styles.query}>
            — {categoryName || `категория #${categoryId}`}
          </span>
        )}
      </h1>

      {loading && <p className={styles.placeholder}>Загрузка...</p>}
      {error && <p className={styles.error}>{error}</p>}

      {!loading && !error && products.length === 0 && (
        <p className={styles.placeholder}>Ничего не найдено</p>
      )}

      {!loading && !error && products.length > 0 && (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </div>
  )
}
