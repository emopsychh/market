import { useState, useEffect, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi, ordersApi, productsApi, wishlistApi } from '../api'
import { useWishlist } from '../contexts/WishlistContext'
import { formatPriceRub } from '../utils/price'
import { ProductCard, type Product } from '../components/ProductCard/ProductCard'
import styles from './ProfilePage.module.css'

interface DeliveryAddress {
  id: number
  city: string
  street: string
  building: string
  apartment?: string
  postal_code?: string
  is_default?: boolean
}

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

export function ProfilePage() {
  const { user, refreshUser, isAuthenticated, isLoading } = useAuth()
  const { ids: wishlistIds, refresh: refreshWishlist } = useWishlist()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/')
  }, [isAuthenticated, isLoading, navigate])
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState<string>('buyer')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [myProducts, setMyProducts] = useState<Product[]>([])
  const [loadingMine, setLoadingMine] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressDeletingId, setAddressDeletingId] = useState<number | null>(null)
  const [orders, setOrders] = useState<Order[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [wishlistProducts, setWishlistProducts] = useState<Product[]>([])
  const [wishlistLoading, setWishlistLoading] = useState(false)

  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [building, setBuilding] = useState('')
  const [apartment, setApartment] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [isDefaultAddress, setIsDefaultAddress] = useState(false)

  const isSeller = user?.role === 'seller' || user?.role === 'admin'
  const statusLabel: Record<Order['status'], string> = {
    pending: 'Ожидает обработки',
    confirmed: 'Подтвержден',
    shipped: 'Отправлен',
    delivered: 'Доставлен',
    cancelled: 'Отменен',
  }

  useEffect(() => {
    if (!isSeller || !user) return
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
  }, [isSeller, user])

  const loadAddresses = async () => {
    setAddressesLoading(true)
    try {
      const { data } = await authApi.getAddresses()
      setAddresses(Array.isArray(data) ? (data as DeliveryAddress[]) : [])
    } finally {
      setAddressesLoading(false)
    }
  }

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
    if (!isAuthenticated) return
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
    loadAddresses()
    loadOrders()
    loadWishlist()
  }, [user])

  useEffect(() => {
    if (!user) return
    loadWishlist()
  }, [wishlistIds, user])

  const handleDeleteProduct = async (productId: number) => {
    if (!confirm('Удалить это объявление?')) return
    setDeletingId(productId)
    try {
      await productsApi.remove(productId)
      setMyProducts((prev) => prev.filter((p) => p.id !== productId))
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '')
      setLastName(user.last_name ?? '')
      setPhone(user.phone ?? '')
      setRole(user.role ?? 'buyer')
    }
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      if (!user) return
      await authApi.updateMe({
        first_name: firstName,
        last_name: lastName,
        phone,
        ...(user.role !== 'admin' && { role }),
      })
      await refreshUser()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handleAddAddress = async (e: FormEvent) => {
    e.preventDefault()
    setAddressSaving(true)
    try {
      await authApi.addAddress({
        city,
        street,
        building,
        apartment,
        postal_code: postalCode,
        is_default: isDefaultAddress,
      })
      setCity('')
      setStreet('')
      setBuilding('')
      setApartment('')
      setPostalCode('')
      setIsDefaultAddress(false)
      await loadAddresses()
      await refreshUser()
    } finally {
      setAddressSaving(false)
    }
  }

  const handleSetDefaultAddress = async (id: number) => {
    await authApi.updateAddress(id, { is_default: true })
    await loadAddresses()
    await refreshUser()
  }

  const handleDeleteAddress = async (id: number) => {
    setAddressDeletingId(id)
    try {
      await authApi.removeAddress(id)
      await loadAddresses()
      await refreshUser()
    } finally {
      setAddressDeletingId(null)
    }
  }

  if (isLoading || !user) return null

  return (
    <div className="container">
      <h1 className={styles.title}>/profile</h1>

      <div className={styles.card}>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{user.email}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Роль</label>
            {user.role === 'admin' ? (
              <span className={styles.value}>Администратор</span>
            ) : (
              <div className={styles.roleOptions}>
                <label className={styles.roleOption}>
                  <input
                    type="radio"
                    name="role"
                    value="buyer"
                    checked={role === 'buyer'}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>Покупатель</span>
                </label>
                <label className={styles.roleOption}>
                  <input
                    type="radio"
                    name="role"
                    value="seller"
                    checked={role === 'seller'}
                    onChange={(e) => setRole(e.target.value)}
                  />
                  <span>Продавец</span>
                </label>
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="first_name" className={styles.label}>Имя</label>
            <input
              id="first_name"
              type="text"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="last_name" className={styles.label}>Фамилия</label>
            <input
              id="last_name"
              type="text"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="phone" className={styles.label}>Телефон</label>
            <input
              id="phone"
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {saved && <p className={styles.saved}>Сохранено</p>}
        </form>
      </div>

      <section className={styles.addressBlock}>
        <h2 className={styles.sectionTitle}>Мои адреса</h2>
        {addressesLoading ? (
          <p className={styles.sellerHint}>Загрузка...</p>
        ) : addresses.length === 0 ? (
          <p className={styles.sellerHint}>Сохраненных адресов пока нет.</p>
        ) : (
          <ul className={styles.addressList}>
            {addresses.map((a) => (
              <li key={a.id} className={styles.addressRow}>
                <div>
                  <p className={styles.addressMain}>
                    {a.city}, {a.street}, {a.building}
                    {a.apartment ? `, кв. ${a.apartment}` : ''}
                  </p>
                  {a.postal_code && <p className={styles.addressMeta}>Индекс: {a.postal_code}</p>}
                </div>
                <div className={styles.addressActions}>
                  {a.is_default ? (
                    <span className={styles.defaultBadge}>По умолчанию</span>
                  ) : (
                    <button type="button" className={styles.sellerBtn} onClick={() => handleSetDefaultAddress(a.id)}>
                      Сделать основным
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.sellerBtnDanger}
                    disabled={addressDeletingId === a.id}
                    onClick={() => handleDeleteAddress(a.id)}
                  >
                    {addressDeletingId === a.id ? '…' : 'Удалить'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form className={styles.addressForm} onSubmit={handleAddAddress}>
          <h3 className={styles.addressFormTitle}>Добавить адрес</h3>
          <div className={styles.addressGrid}>
            <input className={styles.input} placeholder="Город" value={city} onChange={(e) => setCity(e.target.value)} required />
            <input className={styles.input} placeholder="Улица" value={street} onChange={(e) => setStreet(e.target.value)} required />
            <input className={styles.input} placeholder="Дом" value={building} onChange={(e) => setBuilding(e.target.value)} required />
            <input className={styles.input} placeholder="Квартира" value={apartment} onChange={(e) => setApartment(e.target.value)} />
            <input className={styles.input} placeholder="Индекс" value={postalCode} onChange={(e) => setPostalCode(e.target.value)} />
          </div>
          <label className={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isDefaultAddress}
              onChange={(e) => setIsDefaultAddress(e.target.checked)}
            />
            <span>Сделать адресом по умолчанию</span>
          </label>
          <button type="submit" className={styles.submit} disabled={addressSaving}>
            {addressSaving ? 'Сохранение...' : 'Добавить адрес'}
          </button>
        </form>
      </section>

      <section className={styles.ordersBlock}>
        <h2 className={styles.sectionTitle}>Мои заказы</h2>
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
                  {new Date(o.created_at).toLocaleString('ru-RU')} · {o.delivery_city}, {o.delivery_street}, {o.delivery_building}
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
      </section>

      <section className={styles.ordersBlock}>
        <div className={styles.wishlistHead}>
          <h2 className={styles.sectionTitle}>Избранное</h2>
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
      </section>

      {isSeller && (
        <div className={styles.sellerBlock}>
          <h2 className={styles.sellerTitle}>Мои объявления</h2>
          {loadingMine && <p className={styles.sellerHint}>Загрузка...</p>}
          {!loadingMine && myProducts.length === 0 && (
            <p className={styles.sellerHint}>
              Пока нет товаров.{' '}
              <Link to="/products/new" className={styles.sellerLink}>
                Создать
              </Link>
            </p>
          )}
          {!loadingMine && myProducts.length > 0 && (
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
                          · {p.gender === 'unisex'
                            ? 'унисекс'
                            : p.gender === 'female'
                              ? 'женский'
                              : 'мужской'}
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
          {!loadingMine && myProducts.length > 0 && (
            <Link to="/products/new" className={styles.sellerNew}>
              + Новое объявление
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
