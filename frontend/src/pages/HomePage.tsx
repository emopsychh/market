import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../api'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import styles from './HomePage.module.css'

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    productsApi
      .list()
      .then((res) => {
        if (cancelled) return
        const list = (res.data.results ?? res.data ?? []) as Product[]
        setProducts(list.slice(0, 8))
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить товары')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const newProducts = products.slice(0, 4)
  const forYouProducts = products.slice(4, 8)

  return (
    <div className={styles.home}>
      <section className={styles.hero}>
        <div className={styles.heroTitle}>
          <span className={styles.glitchEn} data-text="/silhouette">
            /silhouette
          </span>
          <span className={styles.glitchZh} data-text="輪廓">
            輪廓
          </span>
        </div>
        <p className={styles.subtitle}>
          Direction of brand development to modernity, dynamics, innovation and precision
        </p>
      </section>

      <section className={styles.cta}>
        <Link to="/products" className={styles.ctaLink}>/products</Link>
      </section>

      <section className={styles.feed}>
        {loading && <p className={styles.feedState}>Загрузка...</p>}
        {error && <p className={styles.feedError}>{error}</p>}
        {!loading && !error && products.length === 0 && (
          <p className={styles.feedState}>Пока нет активных товаров</p>
        )}

        {!loading && !error && products.length > 0 && newProducts.length > 0 && (
          <div className={styles.feedBlock}>
            <div className={styles.feedHead}>
              <div className={styles.feedTitleWrap}>
                <p className={styles.feedKicker}>/new</p>
                <h2 className={styles.feedTitle}>Новые поступления</h2>
              </div>
              <Link to="/products" className={styles.feedMore}>
                /products
              </Link>
            </div>
            <div className={styles.grid}>
              {newProducts.map((product) => (
                <ProductCard key={`new-${product.id}`} product={product} />
              ))}
            </div>
          </div>
        )}

        {!loading && !error && products.length > 4 && forYouProducts.length > 0 && (
          <div className={styles.feedBlock}>
            <div className={styles.feedHead}>
              <div className={styles.feedTitleWrap}>
                <p className={styles.feedKicker}>/for-you</p>
                <h2 className={styles.feedTitle}>Подборка для тебя</h2>
              </div>
              <Link to="/products" className={styles.feedMore}>
                /products
              </Link>
            </div>
            <div className={styles.grid}>
              {forYouProducts.map((product) => (
                <ProductCard key={`foryou-${product.id}`} product={product} />
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
