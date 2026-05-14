import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { SearchBar } from '../SearchBar/SearchBar'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import styles from './Header.module.css'

const HEADER_LOGO_SRC = '/brands/logo.png'

export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const cartRef = useRef<HTMLAnchorElement | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [isCartPulse, setIsCartPulse] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  useEffect(() => {
    setProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!profileMenuOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = profileMenuRef.current
      if (!el) return
      const target = e.target as Node
      if (!el.contains(target)) setProfileMenuOpen(false)
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setProfileMenuOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('touchstart', onPointerDown, { passive: true })
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('touchstart', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [profileMenuOpen])

  const handleLogout = () => {
    setProfileMenuOpen(false)
    logout()
    navigate('/')
  }

  const avatarLetter = user?.first_name?.[0] || user?.username?.[0] || user?.email?.[0] || '?'
  const canCreateProducts = user?.role === 'admin' || (user?.role === 'seller' && user?.seller_status === 'approved')
  const canShowBecomeSeller =
    isAuthenticated &&
    user?.role !== 'admin' &&
    (user?.role === 'buyer' || user?.seller_status === 'rejected' || user?.seller_status === 'not_requested')
  const sellerPending = user?.role === 'seller' && user?.seller_status === 'pending'

  useEffect(() => {
    const onCartAdded = (event: Event) => {
      setIsCartPulse(true)
      window.setTimeout(() => setIsCartPulse(false), 280)

      const cartEl = cartRef.current
      if (!cartEl) return
      const detail = (event as CustomEvent<{ imageSrc?: string; startRect?: DOMRect }>).detail
      const startRect = detail?.startRect
      if (!startRect) return

      const endRect = cartEl.getBoundingClientRect()
      const ghost = document.createElement('div')
      const tokenSize = 42
      ghost.style.position = 'fixed'
      ghost.style.left = `${startRect.left + startRect.width / 2 - tokenSize / 2}px`
      ghost.style.top = `${startRect.top + startRect.height / 2 - tokenSize / 2}px`
      ghost.style.width = `${tokenSize}px`
      ghost.style.height = `${tokenSize}px`
      ghost.style.borderRadius = '999px'
      ghost.style.background = detail?.imageSrc
        ? `linear-gradient(rgba(0,0,0,.08), rgba(0,0,0,.08)), url("${detail.imageSrc}") center/cover no-repeat`
        : 'var(--color-text)'
      ghost.style.border = '1px solid rgba(255,255,255,.25)'
      ghost.style.boxShadow = '0 8px 24px rgba(0, 0, 0, .32)'
      ghost.style.zIndex = '9999'
      ghost.style.pointerEvents = 'none'
      ghost.style.transition = 'transform 600ms cubic-bezier(0.22, 0.8, 0.24, 1), opacity 600ms ease'
      document.body.appendChild(ghost)

      const startX = startRect.left + startRect.width / 2
      const startY = startRect.top + startRect.height / 2
      const endX = endRect.left + endRect.width / 2
      const endY = endRect.top + endRect.height / 2
      const dx = endX - startX
      const dy = endY - startY
      requestAnimationFrame(() => {
        ghost.animate(
          [
            { transform: 'translate(0, 0) scale(1)', opacity: 0.95 },
            { transform: `translate(${dx * 0.5}px, ${dy * 0.45 - 42}px) scale(0.82)`, opacity: 0.95 },
            { transform: `translate(${dx}px, ${dy}px) scale(0.28)`, opacity: 0.08 },
          ],
          { duration: 620, easing: 'cubic-bezier(0.22, 0.8, 0.24, 1)', fill: 'forwards' },
        )
      })
      window.setTimeout(() => {
        ghost.remove()
      }, 700)
    }

    window.addEventListener('cart:item-added', onCartAdded as EventListener)
    return () => window.removeEventListener('cart:item-added', onCartAdded as EventListener)
  }, [])

  return (
    <header className={styles.header}>
      <div className={styles.island}>
        <div className={styles.inner}>
          <div className={styles.start}>
            <Link to="/" className={styles.logo} aria-label="NGM — на главную">
              <img
                src={HEADER_LOGO_SRC}
                alt=""
                className={styles.logoImg}
                width={200}
                height={48}
                decoding="async"
              />
            </Link>
          </div>

        <div className={styles.center}>
          <nav className={styles.navPill} aria-label="Основная навигация">
            <Link to="/products" className={styles.pillLink}>
              Products
            </Link>
            {canCreateProducts && (
              <Link to="/products/new" className={styles.pillLinkCta}>
                New
              </Link>
            )}
            {canShowBecomeSeller && (
              <Link to="/seller/apply" className={styles.pillLinkCta} lang="ru">
                Продавец
              </Link>
            )}
            <Link
              ref={cartRef}
              to="/cart"
              className={`${styles.pillLink} ${styles.cartLink} ${isCartPulse ? styles.cartPulse : ''}`}
              data-cart-anchor
            >
              Cart
              {isAuthenticated && itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
            </Link>
          </nav>
        </div>

        <div className={styles.end}>
          {sellerPending && (
            <span className={styles.sellerPending} lang="ru" title="Заявка на статус продавца на модерации">
              Модерация
            </span>
          )}
          <SearchBar />
          {isLoading ? (
            <span className={styles.user}>
              <span className={styles.avatarPlaceholder} aria-hidden />
            </span>
          ) : isAuthenticated ? (
            <span className={styles.user}>
              <div className={styles.profileMenu} ref={profileMenuRef}>
                <button
                  type="button"
                  className={styles.avatarButton}
                  title="Меню профиля"
                  aria-label="Меню профиля"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileMenuOpen((o) => !o)}
                >
                  {avatarLetter.toUpperCase()}
                </button>
                {profileMenuOpen && (
                  <div className={styles.profileDropdown} role="menu">
                    <Link
                      to="/profile"
                      className={styles.profileDropdownLink}
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Профиль
                    </Link>
                    <Link
                      to="/profile/settings"
                      className={styles.profileDropdownLink}
                      role="menuitem"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Настройки аккаунта
                    </Link>
                  </div>
                )}
              </div>
              <button type="button" className={styles.logout} onClick={handleLogout} lang="ru">
                Выход
              </button>
            </span>
          ) : (
            <span className={styles.authLinks}>
              <Link to="/login" className={styles.authLink}>
                Login
              </Link>
              <Link to="/register" className={styles.authLinkPrimary}>
                Register
              </Link>
            </span>
          )}
        </div>
        </div>
      </div>
    </header>
  )
}
