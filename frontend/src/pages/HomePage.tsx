import { type CSSProperties, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../api'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import { BRAND_OPTIONS } from '../constants/brands'
import { getRecentIds } from '../utils/recentlyViewed'
import { formatPriceRub } from '../utils/price'
import { resolveMediaUrl } from '../utils/mediaUrl'
import styles from './HomePage.module.css'

interface RecentProduct {
  id: number
  name: string
  price: string
  imageUrl: string | null
}

export function HomePage() {
  const [products, setProducts] = useState<Product[]>([])
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])
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

  useEffect(() => {
    let cancelled = false
    const ids = getRecentIds(8)
    if (!ids.length) {
      setRecentProducts([])
      return
    }

    ;(async () => {
      const responses = await Promise.allSettled(ids.map((id) => productsApi.detail(id)))
      if (cancelled) return
      const items: RecentProduct[] = []
      for (const result of responses) {
        if (result.status === 'fulfilled') {
          const item = result.value.data as {
            id: number
            name: string
            price: string
            status: string
            images?: Array<{ image: string; order?: number }>
          }
          if (item.status !== 'active') continue
          const sorted = [...(item.images ?? [])].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
          const firstImage = sorted[0]?.image ? resolveMediaUrl(sorted[0].image) : null
          items.push({
            id: item.id,
            name: item.name,
            price: item.price,
            imageUrl: firstImage,
          })
        }
      }
      setRecentProducts(items)
    })()

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

      <section className={styles.brandsSection}>
        <div className={styles.feedHead}>
          <div className={styles.feedTitleWrap}>
            <p className={styles.feedKicker}>/brands</p>
            <h2 className={styles.feedTitle}>Популярные бренды</h2>
          </div>
        </div>

        <div className={styles.brandsGrid}>
          {BRAND_OPTIONS.map((brand) => (
            <Link
              key={brand.slug}
              to={`/products?brand=${encodeURIComponent(brand.slug)}`}
              className={styles.brandCard}
              aria-label={`Открыть товары бренда ${brand.name}`}
              style={{ '--logo-scale': String(brand.scale ?? 1) } as CSSProperties}
            >
              <img src={brand.logo} alt={brand.name} className={styles.brandLogo} loading="lazy" />
            </Link>
          ))}
        </div>
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

        {!loading && !error && recentProducts.length > 0 && (
          <div className={styles.recentBlock}>
            <div className={styles.feedHead}>
              <div className={styles.feedTitleWrap}>
                <p className={styles.feedKicker}>/recent</p>
                <h2 className={styles.feedTitle}>Недавно просмотренные</h2>
              </div>
              <Link to="/products" className={styles.feedMore}>
                /products
              </Link>
            </div>
            <div className={styles.recentRail}>
              {recentProducts.map((product) => (
                <Link key={`recent-${product.id}`} to={`/products/${product.id}`} className={styles.recentCard}>
                  <div className={styles.recentImageWrap}>
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} className={styles.recentImage} />
                    ) : (
                      <div className={styles.recentPlaceholder}>/no image</div>
                    )}
                  </div>
                  <div className={styles.recentMeta}>
                    <p className={styles.recentName}>{product.name}</p>
                    <p className={styles.recentPrice}>{formatPriceRub(product.price)}</p>
                  </div>
                </Link>
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
