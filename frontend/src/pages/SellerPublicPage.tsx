import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { productsApi, sellersApi, type PublicSellerProfile } from '../api'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import styles from './profile/profileShared.module.css'

type SellerTab = 'showcase' | 'reviews'

function joinedLabel(iso?: string) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return `На NGM с ${d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`
  } catch {
    return null
  }
}

export function SellerPublicPage() {
  const { sellerId } = useParams()
  const [profile, setProfile] = useState<PublicSellerProfile | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<SellerTab>('showcase')

  const id = Number(sellerId)

  useEffect(() => {
    if (!sellerId || Number.isNaN(id)) {
      setError('Некорректная ссылка')
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([sellersApi.publicProfile(id), productsApi.list({ seller: id })])
      .then(([profileRes, productsRes]) => {
        if (cancelled) return
        setProfile(profileRes.data)
        const list = productsRes.data.results ?? productsRes.data ?? []
        setProducts(Array.isArray(list) ? list : [])
      })
      .catch(() => {
        if (!cancelled) {
          setProfile(null)
          setProducts([])
          setError('Профиль продавца не найден или недоступен')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [sellerId, id])

  if (loading) {
    return (
      <div className="container">
        <p className={styles.sellerHint}>Загрузка...</p>
      </div>
    )
  }

  if (error || !profile) {
    return (
      <div className="container">
        <p className={styles.errorBox}>{error ?? 'Профиль недоступен'}</p>
        <Link to="/products" className={styles.sellerLink}>
          В каталог
        </Link>
      </div>
    )
  }

  const handle = profile.username ? `@${profile.username}` : ''
  const letter = (profile.display_name?.[0] || profile.username?.[0] || '?').toUpperCase()
  const joined = joinedLabel(profile.date_joined)
  const ratingAvg = profile.seller_rating_avg
  const ratingLabel =
    ratingAvg != null && !Number.isNaN(Number(ratingAvg))
      ? Number(ratingAvg).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : '—'

  const tabs: { id: SellerTab; label: string }[] = [
    { id: 'showcase', label: 'Витрина' },
    { id: 'reviews', label: 'Отзывы' },
  ]

  return (
    <div className="container">
      <p className={styles.pageKicker} lang="en">
        /seller
      </p>

      <section className={styles.publicShell} aria-label="Профиль продавца">
        <div className={styles.publicCover} aria-hidden />
        <div className={styles.publicBody}>
          <div className={styles.publicAvatar} role="img" aria-label={`Аватар: ${profile.display_name}`}>
            {letter}
          </div>
          <div className={styles.publicHeaderRow}>
            <div className={styles.publicNameBlock}>
              <h1 className={styles.publicDisplayName}>{profile.display_name}</h1>
              {handle && <p className={styles.publicHandle}>{handle}</p>}
              {joined && <p className={styles.publicJoined}>{joined}</p>}
            </div>
            {profile.is_own_profile && (
              <Link to="/profile" className={styles.publicSettingsLink}>
                Мой кабинет
              </Link>
            )}
          </div>
        </div>
        <div className={styles.publicStats}>
          <span className={styles.publicStat}>
            Средняя оценка <strong>{ratingLabel}</strong>
          </span>
          <span className={styles.publicStat}>
            Продано <strong>{profile.seller_sold_units ?? 0}</strong>
          </span>
          <span className={styles.publicStat}>
            На витрине <strong>{profile.seller_showcase_count ?? products.length}</strong>
          </span>
        </div>
        <div className={styles.publicBioWrap}>
          <p className={styles.publicBioLabel}>О продавце</p>
          {profile.bio?.trim() ? (
            <p className={styles.publicBioText}>{profile.bio}</p>
          ) : (
            <p className={styles.publicBioMuted}>Продавец пока не добавил описание.</p>
          )}
        </div>
      </section>

      <div className={styles.segTabs} role="tablist" aria-label="Разделы продавца">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`${styles.segTab} ${tab === t.id ? styles.segTabActive : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'showcase' && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Товары на витрине</h2>
          {products.length === 0 ? (
            <p className={styles.sellerHint}>На витрине пока нет опубликованных товаров.</p>
          ) : (
            <div className={styles.wishlistGrid}>
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'reviews' && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Отзывы</h2>
          <p className={styles.placeholder}>
            Отзывы о продавце появятся здесь после запуска системы оценок. Пока можно ориентироваться на статистику
            продаж и ассортимент на витрине.
          </p>
        </div>
      )}
    </div>
  )
}
