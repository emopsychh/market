import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi, ordersApi, productsApi, wishlistApi } from '../../api'
import { useWishlist } from '../../contexts/WishlistContext'
import { formatPriceRub } from '../../utils/price'
import { ProductCard, type Product } from '../../components/ProductCard/ProductCard'
import styles from './profileShared.module.css'

type ActivityTab = 'orders' | 'listings' | 'sold' | 'reviews' | 'wishlist'

interface OrderItem {
  id: number
  product_name: string
  product_price: string
  size: string
  color: string
  quantity: number
  subtotal: string
}

interface Order {
  id: number
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  delivery_city: string
  delivery_street: string
  delivery_building: string
  delivery_apartment?: string
  delivery_postal_code?: string
  items: OrderItem[]
  total: string
  created_at: string
}

const statusLabel: Record<Order['status'], string> = {
  pending: 'Ожидает обработки',
  confirmed: 'Подтвержден',
  shipped: 'Отправлен',
  delivered: 'Доставлен',
  cancelled: 'Отменен',
}

const BIO_MAX = 800

function joinedLabel(iso?: string) {
  if (!iso) return null
  try {
    const d = new Date(iso)
    return `На NGM с ${d.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })}`
  } catch {
    return null
  }
}

export function ProfileActivityPage() {
  const { user, refreshUser } = useAuth()
  const { ids: wishlistIds, refresh: refreshWishlist } = useWishlist()
  const [tab, setTab] = useState<ActivityTab>('orders')

  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [loadingMine, setLoadingMine] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const [editingBio, setEditingBio] = useState(false)
  const [bioDraft, setBioDraft] = useState('')
  const [bioSaving, setBioSaving] = useState(false)

  const isApprovedSeller = user?.role === 'admin' || (user?.role === 'seller' && user?.seller_status === 'approved')

  useEffect(() => {
    if (!isApprovedSeller || !user) return
    let cancelled = false
    setLoadingMine(true)
    productsApi
      .listMine()
      .then((res) => {
        if (!cancelled) setMyProducts(res.data.results ?? res.data ?? [])
      })
      .catch(() => {
        if (!cancelled) setMyProducts([])
      })
      .finally(() => {
        if (!cancelled) setLoadingMine(false)
      })
    return () => {
      cancelled = true
    }
  }, [isApprovedSeller, user])

  const loadOrders = async () => {
    setOrdersLoading(true)
    try {
      const { data } = await ordersApi.list()
      setOrders(Array.isArray(data) ? (data as Order[]) : [])
    } finally {
      setOrdersLoading(false)
    }
  }

  const loadWishlist = async () => {
    setWishlistLoading(true)
    try {
      const { data } = await wishlistApi.list()
      const list = Array.isArray(data) ? data : []
      const products = list
        .map((item) => (item as { product?: Product }).product)
        .filter((product): product is Product => Boolean(product))
      setWishlistProducts(products)
    } finally {
      setWishlistLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadOrders()
    loadWishlist()
  }, [user])

  useEffect(() => {
    if (!user) return
    loadWishlist()
  }, [wishlistIds, user])

  useEffect(() => {
    if (!user || editingBio) return
    setBioDraft(user.bio ?? '')
  }, [user, user?.bio, editingBio])

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Удалить это объявление?')) return
    setDeletingId(productId)
    setDeleteError(null)
    try {
      await productsApi.remove(productId)
      setMyProducts((prev) => prev.filter((p) => p.id !== productId))
      await refreshUser()
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      setDeleteError(data?.detail ?? 'Не удалось удалить объявление')
    } finally {
      setDeletingId(null)
    }
  }

  const handleBioSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setBioSaving(true)
    try {
      await authApi.updateMe({ bio: bioDraft.slice(0, BIO_MAX) })
      await refreshUser()
      setEditingBio(false)
    } finally {
      setBioSaving(false)
    }
  }

  const handleBioCancel = () => {
    setBioDraft(user?.bio ?? '')
    setEditingBio(false)
  }

  const tabs: { id: ActivityTab; label: string }[] = [
    { id: 'orders', label: 'Заказы' },
    { id: 'listings', label: 'Витрина' },
    { id: 'sold', label: 'Продано' },
    { id: 'reviews', label: 'Отзывы' },
    { id: 'wishlist', label: 'Избранное' },
  ]

  if (!user) return null

  const displayName =
    [user.first_name, user.last_name].filter(Boolean).join(' ').trim() || user.username || user.email.split('@')[0]
  const handle = user.username ? `@${user.username}` : `@${user.email.split('@')[0]}`
  const letter = (user.first_name?.[0] || user.username?.[0] || user.email?.[0] || '?').toUpperCase()
  const joined = joinedLabel(user.date_joined)

  const ratingAvg = user.seller_rating_avg
  const ratingLabel =
    ratingAvg != null && !Number.isNaN(Number(ratingAvg))
      ? Number(ratingAvg).toLocaleString('ru-RU', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : '—'
  const soldUnits = user.seller_sold_units ?? 0
  const showcaseCount = user.seller_showcase_count ?? 0

  return (
    <div>
      <section className={styles.publicShell} aria-label="Публичная карточка профиля">
        <div className={styles.publicCover} aria-hidden />
        <div className={styles.publicBody}>
          <div className={styles.publicAvatar} role="img" aria-label={`Аватар: ${displayName}`}>
            {letter}
          </div>
          <div className={styles.publicHeaderRow}>
            <div className={styles.publicNameBlock}>
              <h2 className={styles.publicDisplayName}>{displayName}</h2>
              <p className={styles.publicHandle}>{handle}</p>
              {joined && <p className={styles.publicJoined}>{joined}</p>}
            </div>
            <Link to="/profile/settings" className={styles.publicSettingsLink}>
              Настройки
            </Link>
          </div>
        </div>
        <div className={styles.publicStats}>
          <span className={styles.publicStat}>
            Средняя оценка <strong>{ratingLabel}</strong>
          </span>
          <span className={styles.publicStat}>
            Продано <strong>{soldUnits}</strong>
          </span>
          <span className={styles.publicStat}>
            На витрине <strong>{showcaseCount}</strong>
          </span>
        </div>
        <div className={styles.publicBioWrap}>
          <p className={styles.publicBioLabel}>О себе</p>
          {editingBio ? (
            <form onSubmit={handleBioSave}>
              <textarea
                className={styles.bioTextarea}
                value={bioDraft}
                onChange={(e) => setBioDraft(e.target.value.slice(0, BIO_MAX))}
                maxLength={BIO_MAX}
                rows={5}
                placeholder="Коротко о себе или магазине — это увидят гости твоей публичной страницы."
                aria-label="Текст профиля"
              />
              <div className={styles.bioActions}>
                <button type="submit" className={`${styles.submit} ${styles.submitTight}`} disabled={bioSaving}>
                  {bioSaving ? 'Сохранение...' : 'Сохранить'}
                </button>
                <button type="button" className={styles.bioGhostBtn} disabled={bioSaving} onClick={handleBioCancel}>
                  Отмена
                </button>
                <p className={styles.bioHint}>
                  {bioDraft.length}/{BIO_MAX}
                </p>
              </div>
            </form>
          ) : (
            <>
              {user.bio?.trim() ? (
                <p className={styles.publicBioText}>{user.bio}</p>
              ) : (
                <p className={styles.publicBioMuted}>
                  Пока без описания. Расскажи, что продаёшь или что ищешь — так проще узнаваемость перед публичными
                  профилями.
                </p>
              )}
              <div className={styles.bioActions}>
                <button type="button" className={styles.bioGhostBtn} onClick={() => setEditingBio(true)}>
                  {user.bio?.trim() ? 'Изменить описание' : 'Добавить описание'}
                </button>
              </div>
            </>
          )}
        </div>
      </section>

      <div className={styles.segTabs} role="tablist" aria-label="Разделы профиля">
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

      {tab === 'orders' && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Заказы</h2>
          {ordersLoading ? (
            <p className={styles.sellerHint}>Загрузка...</p>
          ) : orders.length === 0 ? (
            <p className={styles.sellerHint}>Заказов пока нет.</p>
          ) : (
            <ul className={styles.orderList}>
              {orders.map((o) => (
                <li key={o.id} className={styles.orderRow}>
                  <div className={styles.orderHead}>
                    <p className={styles.orderId}>Заказ #{o.id}</p>
                    <p className={styles.orderStatus}>{statusLabel[o.status]}</p>
                  </div>
                  <p className={styles.orderMeta}>
                    {new Date(o.created_at).toLocaleString('ru-RU')} · {o.delivery_city}, {o.delivery_street},{' '}
                    {o.delivery_building}
                  </p>
                  <ul className={styles.orderItems}>
                    {o.items.map((item) => (
                      <li key={item.id} className={styles.orderItem}>
                        <span>{item.product_name}</span>
                        <span>{formatPriceRub(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>
                  <p className={styles.orderTotal}>Итого: {formatPriceRub(o.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'listings' && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Выставленные товары</h2>
          {deleteError && <p className={styles.errorBox}>{deleteError}</p>}
          {!isApprovedSeller && (
            <p className={styles.placeholder}>
              Витрина доступна подтверждённым продавцам. Подай заявку в настройках аккаунта или дождись модерации.
            </p>
          )}
          {isApprovedSeller && loadingMine && <p className={styles.sellerHint}>Загрузка...</p>}
          {isApprovedSeller && !loadingMine && myProducts.length === 0 && (
            <p className={styles.sellerHint}>
              Пока нет товаров.{' '}
              <Link to="/products/new" className={styles.sellerLink}>
                Создать объявление
              </Link>
            </p>
          )}
          {isApprovedSeller && !loadingMine && myProducts.length > 0 && (
            <ul className={styles.sellerList}>
              {myProducts.map((p) => (
                <li key={p.id} className={styles.sellerRow}>
                  <div className={styles.sellerRowMain}>
                    <Link to={`/products/${p.id}`} className={styles.sellerName}>
                      {p.name}
                    </Link>
                    <span className={styles.sellerMeta}>
                      {formatPriceRub(p.price)} · {p.category_name}
                      {p.gender && (
                        <span className={styles.sellerGender}>
                          {' '}
                          ·{' '}
                          {p.gender === 'unisex' ? 'унисекс' : p.gender === 'female' ? 'женский' : 'мужской'}
                        </span>
                      )}
                    </span>
                  </div>
                  <div className={styles.sellerActions}>
                    <Link to={`/products/${p.id}/edit`} className={styles.sellerBtn}>
                      Изменить
                    </Link>
                    <button
                      type="button"
                      className={styles.sellerBtnDanger}
                      disabled={deletingId === p.id}
                      onClick={() => handleDeleteProduct(p.id)}
                    >
                      {deletingId === p.id ? '…' : 'Удалить'}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {isApprovedSeller && !loadingMine && myProducts.length > 0 && (
            <Link to="/products/new" className={styles.sellerNew}>
              + Новое объявление
            </Link>
          )}
        </div>
      )}

      {tab === 'sold' && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Проданные товары</h2>
          <p className={styles.placeholder}>
            Здесь появится история продаж, когда мы подключим учёт сделок. Пока загляни в «Заказы» как покупатель.
          </p>
        </div>
      )}

      {tab === 'reviews' && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Отзывы</h2>
          <p className={styles.placeholder}>
            Отзывы о тебе как о продавце и твои ответы появятся здесь после запуска системы оценок.
          </p>
        </div>
      )}

      {tab === 'wishlist' && (
        <div className={styles.panel}>
          <div className={styles.wishlistHead}>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
              Избранное
            </h2>
            <button
              type="button"
              className={styles.sellerBtn}
              onClick={async () => {
                await refreshWishlist()
                await loadWishlist()
              }}
            >
              Обновить
            </button>
          </div>
          {wishlistLoading ? (
            <p className={styles.sellerHint}>Загрузка...</p>
          ) : wishlistProducts.length === 0 ? (
            <p className={styles.sellerHint}>Пока пусто. Добавляй товары в избранное из каталога.</p>
          ) : (
            <div className={styles.wishlistGrid}>
              {wishlistProducts.map((product) => (
                <ProductCard key={`wishlist-${product.id}`} product={product} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
