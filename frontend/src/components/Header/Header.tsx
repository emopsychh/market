import { Link, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { SearchBar } from '../SearchBar/SearchBar'
import { CategoryNav } from '../CategoryNav/CategoryNav'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import styles from './Header.module.css'

export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { itemCount } = useCart()
  const navigate = useNavigate()
  const cartRef = useRef<HTMLAnchorElement | null>(null)
  const [isCartPulse, setIsCartPulse] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const avatarLetter = user?.first_name?.[0] || user?.username?.[0] || user?.email?.[0] || '?'

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
      <div className={styles.inner}>
        <Link to="/" className={styles.logo}>
          /NGM
        </Link>
        <SearchBar />
        <nav className={styles.nav}>
          <Link to="/products" className={styles.link}>PRODUCTS</Link>
          {(user?.role === 'seller' || user?.role === 'admin') && (
            <Link to="/products/new" className={styles.linkNew}>
              NEW
            </Link>
          )}
          <Link
            ref={cartRef}
            to="/cart"
            className={`${styles.link} ${styles.cartLink} ${isCartPulse ? styles.cartPulse : ''}`}
            data-cart-anchor
          >
            CART
            {isAuthenticated && itemCount > 0 && <span className={styles.cartBadge}>{itemCount}</span>}
          </Link>
          {isLoading ? (
            <span className={styles.user}>
              <span className={styles.avatarPlaceholder} aria-hidden />
            </span>
          ) : isAuthenticated ? (
            <span className={styles.user}>
              <Link to="/profile" className={styles.avatar} title="Профиль" aria-label="Профиль">
                {avatarLetter.toUpperCase()}
              </Link>
              <button type="button" className={styles.logout} onClick={handleLogout}>Выход</button>
            </span>
          ) : (
            <span className={styles.authLinks}>
              <Link to="/login" className={styles.authLink}>LOGIN</Link>
              <Link to="/register" className={styles.authLinkPrimary}>REGISTER</Link>
            </span>
          )}
        </nav>
      </div>
      <CategoryNav />
      <div className={styles.subline}>
        Hypertext Transfer Protocol Secure :// World Wide Web
      </div>
    </header>
  )
}
