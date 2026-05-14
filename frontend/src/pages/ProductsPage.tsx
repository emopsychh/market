import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { productsApi } from '../api'
import { useShopGender } from '../contexts/ShopGenderContext'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import { BRAND_NAME_BY_SLUG } from '../constants/brands'
import styles from './ProductsPage.module.css'

export function ProductsPage() {
  const { shopGender } = useShopGender()
  const [searchParams] = useSearchParams()
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('category') ?? ''
  const categoryName = searchParams.get('category_name') ?? ''
  const brand = searchParams.get('brand') ?? ''

  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const params: { search?: string; category?: number; brand?: string; shop_gender?: 'male' | 'female' } = {}
    if (search) params.search = search
    if (categoryId) {
      const parsedCategory = parseInt(categoryId, 10)
      if (!Number.isNaN(parsedCategory)) params.category = parsedCategory
    }
    if (brand) params.brand = brand
    if (shopGender) params.shop_gender = shopGender
    productsApi
      .list(Object.keys(params).length ? params : undefined)
      .then((res) => setProducts(res.data.results ?? res.data))
      .catch((err) => setError(err.message || 'Ошибка загрузки'))
      .finally(() => setLoading(false))
  }, [search, categoryId, brand, shopGender])

  return (
    <div className="container">
      <h1 className={styles.title}>
        /products
        {brand && <span className={styles.query}> — {BRAND_NAME_BY_SLUG[brand] ?? brand}</span>}
        {search && <span className={styles.query}> — «{search}»</span>}
        {categoryId && !search && !brand && (
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
