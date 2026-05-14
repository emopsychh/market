import { useEffect, useState, FormEvent } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { productsApi, cartApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { useWishlist } from '../contexts/WishlistContext'
import { formatDiscountPercent, formatPriceRub, parsePriceNum } from '../utils/price'
import { resolveMediaUrl } from '../utils/mediaUrl'
import { pushProductId } from '../utils/recentlyViewed'
import styles from './ProductDetailPage.module.css'

interface ProductImage {
  id: number
  image: string
  order: number
}

interface ProductDetail {
  id: number
  name: string
  description: string
  price: string
  compare_at_price?: string | null
  category: number
  category_name: string
  seller_name: string
  seller: number
  sizes: string[]
  colors: string[]
  gender: 'male' | 'female' | 'unisex'
  images: ProductImage[]
  status: string
}

function formatCartApiError(data: unknown): string {
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if (typeof d.detail === 'string') return d.detail
    const parts: string[] = []
    for (const [key, val] of Object.entries(d)) {
      if (Array.isArray(val)) parts.push(`${key}: ${val.join(', ')}`)
      else if (typeof val === 'string') parts.push(val)
      else if (val && typeof val === 'object') parts.push(`${key}: ${JSON.stringify(val)}`)
    }
    if (parts.length) return parts.join('; ')
  }
  return 'Не удалось добавить в корзину'
}

export function ProductDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { refreshCartCount } = useCart()
  const { isInWishlist, toggle } = useWishlist()

  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [activeImage, setActiveImage] = useState(0)
  const [size, setSize] = useState('')
  const [color, setColor] = useState('')
  const [cartSubmitting, setCartSubmitting] = useState(false)
  const [cartMessage, setCartMessage] = useState<string | null>(null)
  const [cartError, setCartError] = useState<string | null>(null)

  useEffect(() => {
    const num = Number(id)
    if (!id || Number.isNaN(num)) {
      setError('Некорректная ссылка')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)
    productsApi
      .detail(num)
      .then(({ data }) => {
        if (cancelled) return
        setProduct(data as ProductDetail)
        pushProductId(num)
        const d = data as ProductDetail
        const sizes = d.sizes ?? []
        const colors = d.colors ?? []
        setSize(sizes[0] ?? '')
        setColor(colors[0] ?? '')
        setActiveImage(0)
      })
      .catch(() => {
        if (!cancelled) setError('Товар не найден')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [id])

  const imageUrls =
    product?.images?.length && product.images.length > 0
      ? [...product.images].sort((a, b) => a.order - b.order).map((img) => resolveMediaUrl(img.image))
      : []

  const handleAddToCart = async (e: FormEvent) => {
    e.preventDefault()
    const formEl = e.currentTarget as HTMLFormElement
    setCartMessage(null)
    setCartError(null)
    if (!product) return

    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.id}` } })
      return
    }

    if (product.sizes.length && !size) {
      setCartError('Выберите размер')
      return
    }
    if (product.colors.length && !color) {
      setCartError('Выберите цвет')
      return
    }

    setCartSubmitting(true)
    try {
      await cartApi.addItem({
        product: product.id,
        size: size || product.sizes[0] || '',
        color: color || product.colors[0] || '',
        quantity: 1,
      })
      await refreshCartCount()
      const addBtnEl = formEl.querySelector(`.${styles.addBtn}`) as HTMLButtonElement | null
      const imageSrc = imageUrls[activeImage]
      if (addBtnEl && imageSrc) {
        window.dispatchEvent(
          new CustomEvent('cart:item-added', {
            detail: {
              imageSrc,
              startRect: addBtnEl.getBoundingClientRect(),
            },
          }),
        )
      } else {
        window.dispatchEvent(new CustomEvent('cart:item-added'))
      }
      setCartMessage('Добавлено в корзину')
    } catch (err: unknown) {
      const data =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response
          ? (err.response as { data?: unknown }).data
          : null
      const text = formatCartApiError(data)
      setCartError(text)
    } finally {
      setCartSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="container">
        <Link to="/products" className={styles.back}>
          ← /products
        </Link>
        <p className={styles.muted}>Загрузка...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container">
        <Link to="/products" className={styles.back}>
          ← /products
        </Link>
        <p className={styles.error}>{error}</p>
      </div>
    )
  }

  const categoryHref = `/products?category=${product.category}&category_name=${encodeURIComponent(product.category_name)}`

  const currentPrice = parsePriceNum(product.price)
  const comparePrice = parsePriceNum(product.compare_at_price ?? null)
  const showSale =
    currentPrice !== null && comparePrice !== null && comparePrice > currentPrice
  const discountLabel =
    showSale && comparePrice !== null && currentPrice !== null
      ? formatDiscountPercent(comparePrice, currentPrice)
      : ''

  return (
    <div className="container">
      <Link to="/products" className={styles.back}>
        ← /products
      </Link>

      <article className={styles.layout}>
        <div className={styles.gallery}>
          <div className={styles.mainImage}>
            {imageUrls.length > 0 ? (
              <img
                src={imageUrls[activeImage]}
                alt={product.name}
                className={styles.mainImg}
              />
            ) : (
              <div className={styles.imagePlaceholder}>/no image</div>
            )}
          </div>
          {imageUrls.length > 1 && (
            <div className={styles.thumbs}>
              {imageUrls.map((src, i) => (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  className={i === activeImage ? styles.thumbActive : styles.thumb}
                  onClick={() => setActiveImage(i)}
                >
                  <img src={src} alt="" draggable={false} />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className={styles.panel}>
          <h1 className={styles.name}>{product.name}</h1>
          {showSale && comparePrice !== null && currentPrice !== null ? (
            <div className={styles.priceBlock}>
              <div className={styles.priceRow}>
                <span className={styles.priceWas}>{formatPriceRub(comparePrice)}</span>
                <span className={styles.priceNow}>{formatPriceRub(currentPrice)}</span>
              </div>
              {discountLabel ? <p className={styles.discount}>{discountLabel}</p> : null}
            </div>
          ) : (
            <p className={styles.price}>{formatPriceRub(product.price)}</p>
          )}
          <Link to={categoryHref} className={styles.category}>
            {product.category_name}
          </Link>
          <p className={styles.metaLine}>
            Пол:{' '}
            {product.gender === 'female'
              ? 'женский'
              : product.gender === 'unisex'
                ? 'унисекс'
                : 'мужской'}
          </p>
          {product.seller_name && (
            <p className={styles.seller}>Продавец: {product.seller_name}</p>
          )}
          {user && (user.id === product.seller || user.role === 'admin') && (
            <Link to={`/products/${product.id}/edit`} className={styles.editLink}>
              Редактировать объявление
            </Link>
          )}

          {product.description && (
            <div className={styles.description}>
              {product.description.split('\n').map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          )}

          <form className={styles.form} onSubmit={handleAddToCart}>
            {product.sizes.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Размер</span>
                <div className={styles.chips}>
                  {product.sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className={size === s ? styles.chipActive : styles.chip}
                      onClick={() => setSize(s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.colors.length > 0 && (
              <div className={styles.field}>
                <span className={styles.label}>Цвет</span>
                <div className={styles.chips}>
                  {product.colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      className={color === c ? styles.chipActive : styles.chip}
                      onClick={() => setColor(c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {cartError && <p className={styles.formError}>{cartError}</p>}
            {cartMessage && <p className={styles.formSuccess}>{cartMessage}</p>}

            <div className={styles.actions}>
              <button type="submit" className={styles.addBtn} disabled={cartSubmitting}>
                {cartSubmitting ? '…' : isAuthenticated ? 'В корзину' : 'Войти и добавить'}
              </button>
              <button
                type="button"
                className={styles.wishBtn}
                onClick={async () => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: `/products/${product.id}` } })
                    return
                  }
                  try {
                    await toggle(product.id)
                  } catch {
                    // keep page stable on request failures
                  }
                }}
              >
                {isInWishlist(product.id) ? 'Убрать из избранного' : 'В избранное'}
              </button>
              <Link to="/cart" className={styles.cartLink}>
                Перейти в корзину
              </Link>
            </div>
          </form>
        </div>
      </article>
    </div>
  )
}
