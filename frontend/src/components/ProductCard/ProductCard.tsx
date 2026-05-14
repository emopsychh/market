import { type KeyboardEvent, type MouseEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatDiscountPercent, formatPriceRub, parsePriceNum } from '../../utils/price'
import { BRAND_NAME_BY_SLUG } from '../../constants/brands'
import { useAuth } from '../../contexts/AuthContext'
import { useWishlist } from '../../contexts/WishlistContext'
import styles from './ProductCard.module.css'

export interface Product {
  id: number
  name: string
  price: string
  compare_at_price?: string | null
  category: number
  category_name: string
  sizes: string[]
  colors: string[]
  gender?: 'male' | 'female' | 'unisex'
  brand?: string
  first_image: string | null
  preview_images?: string[]
  images_count?: number
  status: string
}

interface ProductCardProps {
  product: Product
}

/** Порядок как в API: превью для наведения; иначе одно главное фото */
function getGalleryUrls(product: Product): string[] {
  const previews = product.preview_images?.filter(Boolean) ?? []
  if (previews.length > 0) return previews
  if (product.first_image) return [product.first_image]
  return []
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      className={styles.heartSvg}
      width="17"
      height="17"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.35"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

export function ProductCard({ product }: ProductCardProps) {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuth()
  const { isInWishlist, toggle } = useWishlist()
  const galleryUrls = useMemo(() => getGalleryUrls(product), [product])
  const [hoverImageIndex, setHoverImageIndex] = useState(0)
  const lastHoverIndexRef = useRef(-1)
  const displayUrl = galleryUrls[hoverImageIndex] ?? galleryUrls[0] ?? null
  const inWishlist = isInWishlist(product.id)

  useEffect(() => {
    setHoverImageIndex(0)
    lastHoverIndexRef.current = -1
  }, [product.id])

  const handleMediaMove = useCallback(
    (e: MouseEvent<HTMLDivElement>) => {
      if (galleryUrls.length <= 1 || prefersReducedMotion()) return
      const el = e.currentTarget
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / Math.max(r.width, 1)
      const idx = Math.min(galleryUrls.length - 1, Math.max(0, Math.floor(x * galleryUrls.length)))
      if (idx !== lastHoverIndexRef.current) {
        lastHoverIndexRef.current = idx
        setHoverImageIndex(idx)
      }
    },
    [galleryUrls],
  )

  const handleMediaLeave = useCallback(() => {
    lastHoverIndexRef.current = -1
    setHoverImageIndex(0)
  }, [])

  const brandLabel = product.brand ? BRAND_NAME_BY_SLUG[product.brand] ?? product.brand : ''

  const current = parsePriceNum(product.price)
  const compare = parsePriceNum(product.compare_at_price ?? null)
  const onSale = current !== null && compare !== null && compare > current
  const discountLabel = onSale && compare !== null && current !== null ? formatDiscountPercent(compare, current) : ''

  const handleWishlistToggle = async (e: MouseEvent<HTMLSpanElement>) => {
    e.preventDefault()
    e.stopPropagation()
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/products/${product.id}` } })
      return
    }
    try {
      await toggle(product.id)
    } catch {
      // ignore UI errors in card action
    }
  }

  return (
    <Link to={`/products/${product.id}`} className={styles.card}>
      <div className={styles.cardInner}>
        <div
          className={styles.media}
          onMouseMove={galleryUrls.length > 1 ? handleMediaMove : undefined}
          onMouseLeave={galleryUrls.length > 1 ? handleMediaLeave : undefined}
        >
          {displayUrl ? (
            <img src={displayUrl} alt="" className={styles.image} />
          ) : (
            <div className={styles.placeholder} lang="en">
              /no image
            </div>
          )}
          <span
            className={inWishlist ? styles.wishActive : styles.wish}
            role="button"
            tabIndex={0}
            aria-label={inWishlist ? 'Убрать из избранного' : 'Добавить в избранное'}
            onClick={handleWishlistToggle}
            onKeyDown={(e: KeyboardEvent<HTMLSpanElement>) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                void handleWishlistToggle(e as unknown as MouseEvent<HTMLSpanElement>)
              }
            }}
          >
            <HeartIcon filled={inWishlist} />
          </span>
        </div>

        <div className={styles.copy}>
          {brandLabel ? (
            <p className={styles.brand} lang="en">
              {brandLabel}
            </p>
          ) : null}
          <p className={styles.title}>{product.name}</p>

          <div className={styles.priceBlock}>
            {onSale && compare !== null && current !== null ? (
              <>
                <div className={styles.priceRow}>
                  <span className={styles.priceWas}>{formatPriceRub(compare)}</span>
                  <span className={styles.priceNow}>{formatPriceRub(current)}</span>
                </div>
                {discountLabel ? <p className={styles.discount}>{discountLabel}</p> : null}
              </>
            ) : (
              <p className={styles.priceSingle}>{formatPriceRub(product.price)}</p>
            )}
          </div>
        </div>
      </div>
    </Link>
  )
}
