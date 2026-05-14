import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { productsApi } from '../api'
import { useShopGender } from '../contexts/ShopGenderContext'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import { getRecentIds } from '../utils/recentlyViewed'
import { formatPriceRub } from '../utils/price'
import { resolveMediaUrl } from '../utils/mediaUrl'
import styles from './HomePage.module.css'

/** Кадры из `public/frames/` (frame_00000.jpg …) */
const HERO_FRAME_COUNT = 202
const HERO_FPS = 24
const HERO_PRELOAD_CONCURRENCY = 12

function heroFrameSrc(index: number) {
  const n = ((index % HERO_FRAME_COUNT) + HERO_FRAME_COUNT) % HERO_FRAME_COUNT
  return `/frames/frame_${String(n).padStart(5, '0')}.jpg`
}

async function loadHeroFrameImage(src: string): Promise<HTMLImageElement> {
  const im = new Image()
  im.src = src
  if (im.decode) {
    try {
      await im.decode()
      return im
    } catch {
      /* decode failed, fall back to onload */
    }
  }
  await new Promise<void>((resolve) => {
    if (im.complete && im.naturalWidth) resolve()
    else {
      im.onload = () => resolve()
      im.onerror = () => resolve()
    }
  })
  return im
}

async function preloadHeroFrames(): Promise<HTMLImageElement[]> {
  const out: HTMLImageElement[] = new Array(HERO_FRAME_COUNT)
  let cursor = 0
  async function worker() {
    while (true) {
      const i = cursor++
      if (i >= HERO_FRAME_COUNT) break
      out[i] = await loadHeroFrameImage(heroFrameSrc(i))
    }
  }
  await Promise.all(Array.from({ length: HERO_PRELOAD_CONCURRENCY }, () => worker()))
  return out
}

/** object-fit: cover + ~1.06 scale и лёгкий сдвиг как у прежнего video-героя */
function drawHeroCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number,
  h: number,
) {
  const nw = img.naturalWidth
  const nh = img.naturalHeight
  if (!nw || !nh) return
  const cover = Math.max(w / nw, h / nh) * 1.06
  const dw = nw * cover
  const dh = nh * cover
  const dx = (w - dw) / 2
  const dy = (h - dh) / 2 + h * 0.04
  ctx.drawImage(img, dx, dy, dw, dh)
}

interface RecentProduct {
  id: number
  name: string
  price: string
  imageUrl: string | null
}

export function HomePage() {
  const { shopGender } = useShopGender()
  const [products, setProducts] = useState<Product[]>([])
  const [recentProducts, setRecentProducts] = useState<RecentProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const heroMediaRef = useRef<HTMLDivElement>(null)
  const heroCanvasRef = useRef<HTMLCanvasElement>(null)
  const heroFramesRef = useRef<HTMLImageElement[]>([])
  const heroFilmRafRef = useRef(0)
  const heroFilmAccRef = useRef(0)
  const heroFilmLastTRef = useRef(0)
  const heroFilmIxRef = useRef(0)
  const heroFilmDirRef = useRef(1)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const media = heroMediaRef.current
    const canvas = heroCanvasRef.current
    if (!media || !canvas) return

    let cancelled = false
    const ctx = canvas.getContext('2d', { alpha: false })
    if (!ctx) return

    heroFilmAccRef.current = 0
    heroFilmLastTRef.current = 0
    heroFilmIxRef.current = 0
    heroFilmDirRef.current = 1

    const frameMs = 1000 / HERO_FPS
    /** За один тик rAF не двигаем больше кадров — иначе после фона вкладки «догон» ускоряет ролик */
    const maxCatchupMs = frameMs * 3

    const resetFilmClock = () => {
      heroFilmLastTRef.current = 0
      heroFilmAccRef.current = 0
    }

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') resetFilmClock()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)

    const syncCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = media.clientWidth
      const h = media.clientHeight
      if (!w || !h) return
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const paint = () => {
      const w = media.clientWidth
      const h = media.clientHeight
      if (!w || !h) return
      const frames = heroFramesRef.current
      const img = frames[heroFilmIxRef.current]
      if (!img?.naturalWidth) return
      ctx.fillStyle = '#05070b'
      ctx.fillRect(0, 0, w, h)
      drawHeroCover(ctx, img, w, h)
    }

    const ro = new ResizeObserver(() => {
      syncCanvasSize()
      paint()
    })
    ro.observe(media)

    ;(async () => {
      const frames = await preloadHeroFrames()
      if (cancelled) return
      heroFramesRef.current = frames
      syncCanvasSize()
      paint()

      const loop = (t: number) => {
        if (cancelled) return
        if (!heroFilmLastTRef.current) heroFilmLastTRef.current = t
        heroFilmAccRef.current += t - heroFilmLastTRef.current
        heroFilmLastTRef.current = t
        if (heroFilmAccRef.current > maxCatchupMs) heroFilmAccRef.current = maxCatchupMs
        while (heroFilmAccRef.current >= frameMs) {
          heroFilmAccRef.current -= frameMs
          const last = HERO_FRAME_COUNT - 1
          let i = heroFilmIxRef.current + heroFilmDirRef.current
          let d = heroFilmDirRef.current
          if (i > last) {
            i = last
            d = -1
          } else if (i < 0) {
            i = 0
            d = 1
          }
          heroFilmIxRef.current = i
          heroFilmDirRef.current = d
        }
        paint()
        heroFilmRafRef.current = requestAnimationFrame(loop)
      }
      heroFilmRafRef.current = requestAnimationFrame(loop)
    })()

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisibilityChange)
      cancelAnimationFrame(heroFilmRafRef.current)
      ro.disconnect()
      heroFramesRef.current = []
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    productsApi
      .list(shopGender ? { shop_gender: shopGender } : undefined)
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
  }, [shopGender])

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
      <div className={styles.heroShell}>
        <div ref={heroMediaRef} className={styles.heroMedia} aria-hidden>
          <canvas ref={heroCanvasRef} className={styles.heroFilmCanvas} />
          <img
            className={styles.heroFrameStatic}
            src={heroFrameSrc(0)}
            alt=""
            decoding="async"
            fetchPriority="high"
          />
          <div className={styles.heroVideoOverlay} />
        </div>

        <section className={styles.hero}>
          <h1 className="visually-hidden" lang="ru">
            NGM — маркетплейс одежды: место для вещей и людей
          </h1>
          <p className={styles.subtitle}>
            <span className={styles.subtitleMain}>Место для вещей и людей.</span>
            <span className={styles.subtitleKicker} lang="en">
              NGM / people & pieces
            </span>
          </p>
        </section>

        <section className={styles.cta}>
          <Link to="/products" className={styles.heroCta}>
            Смотреть каталог
          </Link>
        </section>
      </div>

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
                <p className={styles.feedKicker} lang="en">
                  /new
                </p>
                <h2 className={styles.feedTitle} lang="ru">
                  Новинки
                </h2>
              </div>
              <Link to="/products" className={styles.feedMore} lang="en">
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
                <p className={styles.feedKicker} lang="en">
                  /recent
                </p>
                <h2 className={styles.feedTitle} lang="ru">
                  Недавно просмотренные
                </h2>
              </div>
              <Link to="/products" className={styles.feedMore} lang="en">
                /products
              </Link>
            </div>
            <div className={styles.recentRail}>
              {recentProducts.map((product) => (
                <Link key={`recent-${product.id}`} to={`/products/${product.id}`} className={styles.recentCard}>
                  <div className={styles.recentCardInner}>
                    <div className={styles.recentImageWrap}>
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.name} className={styles.recentImage} />
                      ) : (
                        <div className={styles.recentPlaceholder} lang="en">
                          /no image
                        </div>
                      )}
                    </div>
                    <div className={styles.recentMeta}>
                      <p className={styles.recentName}>{product.name}</p>
                      <p className={styles.recentPrice}>{formatPriceRub(product.price)}</p>
                    </div>
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
                <p className={styles.feedKicker} lang="en">
                  /for-you
                </p>
                <h2 className={styles.feedTitle} lang="ru">
                  Подборка для тебя
                </h2>
              </div>
              <Link to="/products" className={styles.feedMore} lang="en">
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
