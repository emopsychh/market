import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { authApi, cartApi, ordersApi } from '../api'
import { useAuth } from '../contexts/AuthContext'
import { useCart } from '../contexts/CartContext'
import { formatPriceRub } from '../utils/price'
import { resolveMediaUrl } from '../utils/mediaUrl'
import styles from './CartPage.module.css'

interface CartProduct {
  id: number
  name: string
  price: string
  category_name: string
  preview_images: string[]
  first_image: string | null
}

interface CartItem {
  id: number
  product: CartProduct
  size: string
  color: string
  quantity: number
  subtotal: string
}

interface CartData {
  id: number
  items: CartItem[]
  total: string
  updated_at: string
}

interface DeliveryAddress {
  id: number
  city: string
  street: string
  building: string
  apartment?: string
  postal_code?: string
  is_default?: boolean
}

export function CartPage() {
  const navigate = useNavigate()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { refreshCartCount } = useCart()
  const [cart, setCart] = useState<CartData | null>(null)
  const [addresses, setAddresses] = useState<DeliveryAddress[]>([])
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyItemId, setBusyItemId] = useState<number | null>(null)
  const [checkoutBusy, setCheckoutBusy] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)

  const loadCart = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { data } = await cartApi.get()
      setCart(data as CartData)
      await refreshCartCount()
    } catch {
      setError('Не удалось загрузить корзину')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, refreshCartCount])

  const loadAddresses = useCallback(async () => {
    if (!isAuthenticated) return
    try {
      const { data } = await authApi.getAddresses()
      const next = Array.isArray(data) ? (data as DeliveryAddress[]) : []
      setAddresses(next)
      const preferred = next.find((a) => a.is_default) || next[0]
      setSelectedAddressId(preferred?.id ?? null)
    } catch {
      setAddresses([])
      setSelectedAddressId(null)
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (authLoading) return
    loadCart()
    loadAddresses()
  }, [authLoading, loadCart, loadAddresses])

  const handleRemoveItem = async (itemId: number) => {
    setBusyItemId(itemId)
    setError(null)
    try {
      await cartApi.removeItem(itemId)
      await loadCart()
      await refreshCartCount()
    } catch {
      setError('Не удалось удалить товар из корзины')
    } finally {
      setBusyItemId(null)
    }
  }

  const handleCheckout = async () => {
    if (!selectedAddressId) {
      setCheckoutError('Выберите адрес доставки')
      return
    }
    setCheckoutError(null)
    setCheckoutBusy(true)
    try {
      const { data } = await ordersApi.create({ address_id: selectedAddressId })
      await loadCart()
      await refreshCartCount()
      navigate('/profile')
      if (data && typeof data === 'object' && 'id' in data) {
        window.alert(`Заказ #${String((data as { id: number }).id)} создан`)
      }
    } catch {
      setCheckoutError('Не удалось оформить заказ')
    } finally {
      setCheckoutBusy(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="container">
        <h1 className={styles.title}>/cart</h1>
        <p className={styles.muted}>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <h1 className={styles.title}>/cart</h1>
        <p className={styles.muted}>Чтобы посмотреть корзину, войдите в аккаунт.</p>
        <button type="button" className={styles.loginBtn} onClick={() => navigate('/login', { state: { from: '/cart' } })}>
          Войти
        </button>
      </div>
    )
  }

  const items = cart?.items ?? []

  return (
    <div className="container">
      <h1 className={styles.title}>/cart</h1>
      {error && <p className={styles.error}>{error}</p>}

      {items.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.muted}>В корзине пока пусто</p>
          <Link to="/products" className={styles.browseLink}>
            Перейти к товарам
          </Link>
        </div>
      ) : (
        <div className={styles.layout}>
          <div className={styles.items}>
            {items.map((item) => {
              const image = item.product.preview_images?.[0] || item.product.first_image || ''
              return (
                <article key={item.id} className={styles.item}>
                  <Link to={`/products/${item.product.id}`} className={styles.thumbLink}>
                    {image ? (
                      <img src={resolveMediaUrl(image)} alt={item.product.name} className={styles.thumb} />
                    ) : (
                      <div className={styles.noImage}>/no image</div>
                    )}
                  </Link>

                  <div className={styles.meta}>
                    <Link to={`/products/${item.product.id}`} className={styles.name}>
                      {item.product.name}
                    </Link>
                    <p className={styles.category}>{item.product.category_name}</p>
                    {(item.size || item.color) && (
                      <p className={styles.variant}>
                        {item.size ? `Размер: ${item.size}` : ''}
                        {item.size && item.color ? ' · ' : ''}
                        {item.color ? `Цвет: ${item.color}` : ''}
                      </p>
                    )}
                    <p className={styles.qty}>Количество: 1</p>
                  </div>

                  <div className={styles.side}>
                    <p className={styles.price}>{formatPriceRub(item.subtotal)}</p>
                    <button
                      type="button"
                      className={styles.removeBtn}
                      onClick={() => handleRemoveItem(item.id)}
                      disabled={busyItemId === item.id}
                    >
                      {busyItemId === item.id ? 'Удаляем…' : 'Удалить'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>

          <aside className={styles.summary}>
            <p className={styles.summaryLabel}>Итого</p>
            <p className={styles.total}>{formatPriceRub(cart?.total || 0)}</p>
            <div className={styles.checkout}>
              <label htmlFor="address_id" className={styles.addressLabel}>
                Адрес доставки
              </label>
              {addresses.length > 0 ? (
                <select
                  id="address_id"
                  className={styles.addressSelect}
                  value={selectedAddressId ?? ''}
                  onChange={(e) => setSelectedAddressId(Number(e.target.value))}
                >
                  {addresses.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.city}, {a.street}, {a.building}
                      {a.apartment ? `, кв. ${a.apartment}` : ''}
                      {a.postal_code ? ` (${a.postal_code})` : ''}
                    </option>
                  ))}
                </select>
              ) : (
                <p className={styles.note}>
                  Нет сохраненных адресов. Добавьте адрес в профиле.
                </p>
              )}

              {checkoutError && <p className={styles.checkoutError}>{checkoutError}</p>}

              <button
                type="button"
                className={styles.checkoutBtn}
                onClick={handleCheckout}
                disabled={checkoutBusy || addresses.length === 0}
              >
                {checkoutBusy ? 'Оформляем…' : 'Оформить заказ'}
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  )
}
