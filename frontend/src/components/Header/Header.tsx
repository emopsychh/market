import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { SearchBar } from '../SearchBar/SearchBar'
import { useAuth } from '../../contexts/AuthContext'
import { useCart } from '../../contexts/CartContext'
import { useShopGender } from '../../contexts/ShopGenderContext'
import { categoriesApi } from '../../api'
import { useBrands } from '../../hooks/useBrands'
import { filterNavCategories } from '../../utils/isGenderShowcaseCategory'
import { isBrandsCategory } from '../../utils/categoryNav'
import { HeaderNavMegaMenu, type MegaMenuLink } from './HeaderNavMegaMenu'
import styles from './Header.module.css'

type NavCategory = { id: number; name: string; slug?: string }

const HEADER_LOGO_SRC = '/brands/logo.png'

function UserIcon() {
  return (
    <svg
      className={styles.userIcon}
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M5 20.5c0-3.5 3.13-5.5 7-5.5s7 2 7 5.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Header() {
  const { user, isAuthenticated, isLoading, logout } = useAuth()
  const { itemCount } = useCart()
  const { shopGender, selectMale, selectFemale } = useShopGender()
  const navigate = useNavigate()
  const location = useLocation()
  const cartRef = useRef<HTMLAnchorElement | null>(null)
  const profileMenuRef = useRef<HTMLDivElement | null>(null)
  const [topCategories, setTopCategories] = useState<NavCategory[]>([])
  const [hoveredCategory, setHoveredCategory] = useState<NavCategory | null>(null)
  const [megaItems, setMegaItems] = useState<MegaMenuLink[]>([])
  const [megaLoading, setMegaLoading] = useState(false)
  const [isCartPulse, setIsCartPulse] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const childrenCacheRef = useRef<Record<number, MegaMenuLink[]>>({})
  const brandsCacheRef = useRef<MegaMenuLink[] | null>(null)
  const megaCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const { brands } = useBrands()

  useEffect(() => {
    setProfileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!profileMenuOpen) return
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const el = profileMenuRef.current
      if (!el) return
      if (!el.contains(e.target as Node)) setProfileMenuOpen(false)
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

  const canCreateProducts =
    user?.role === 'admin' || (user?.role === 'seller' && user?.seller_status === 'approved')
  const canShowBecomeSeller =
    isAuthenticated &&
    user?.role !== 'admin' &&
    (user?.role === 'buyer' || user?.seller_status === 'rejected' || user?.seller_status === 'not_requested')
  const sellerPending = user?.role === 'seller' && user?.seller_status === 'pending'

  const catalogCategoryId = (() => {
    if (location.pathname !== '/products') return null
    const raw = new URLSearchParams(location.search).get('category')
    if (!raw) return null
    const n = parseInt(raw, 10)
    return Number.isNaN(n) ? null : n
  })()
  const categoryHref = useCallback((id: number, name: string) => {
    return `/products?category=${id}&category_name=${encodeURIComponent(name)}`
  }, [])

  const cancelMegaClose = useCallback(() => {
    if (megaCloseTimerRef.current) {
      clearTimeout(megaCloseTimerRef.current)
      megaCloseTimerRef.current = null
    }
  }, [])

  const scheduleMegaClose = useCallback(() => {
    cancelMegaClose()
    megaCloseTimerRef.current = setTimeout(() => {
      setHoveredCategory(null)
      setMegaItems([])
      setMegaLoading(false)
    }, 200)
  }, [cancelMegaClose])

  const openMegaForCategory = useCallback(
    async (cat: NavCategory) => {
      setHoveredCategory(cat)

      if (isBrandsCategory(cat)) {
        const items =
          brandsCacheRef.current ??
          brands.map((b) => ({
            key: b.slug,
            name: b.name,
            href: `/products?brand=${encodeURIComponent(b.slug)}`,
          }))
        brandsCacheRef.current = items
        setMegaLoading(false)
        if (items.length === 0) {
          setHoveredCategory(null)
          setMegaItems([])
        } else {
          setMegaItems(items)
        }
        return
      }

      const cached = childrenCacheRef.current[cat.id]
      if (cached) {
        if (cached.length === 0) {
          setHoveredCategory(null)
          setMegaItems([])
          return
        }
        setMegaItems(cached)
        setMegaLoading(false)
        return
      }

      setMegaLoading(true)
      setMegaItems([])
      try {
        const res = await categoriesApi.list({ parent: cat.id })
        const list = (res.data.results ?? res.data ?? []) as Array<{ id: number; name: string }>
        const items: MegaMenuLink[] = list
          .filter((c) => typeof c?.id === 'number' && typeof c?.name === 'string')
          .map((c) => ({
            key: String(c.id),
            name: c.name,
            href: categoryHref(c.id, c.name),
          }))
        childrenCacheRef.current[cat.id] = items
        if (items.length === 0) {
          setHoveredCategory(null)
          setMegaItems([])
        } else {
          setMegaItems(items)
        }
      } catch {
        setHoveredCategory(null)
        setMegaItems([])
      } finally {
        setMegaLoading(false)
      }
    },
    [categoryHref, brands],
  )

  const handleCategoryEnter = useCallback(
    (cat: NavCategory) => {
      cancelMegaClose()
      void openMegaForCategory(cat)
    },
    [cancelMegaClose, openMegaForCategory],
  )

  const showMegaMenu =
    hoveredCategory !== null &&
    (megaLoading || megaItems.length > 0 || isBrandsCategory(hoveredCategory))

  useEffect(() => {
    let cancelled = false
    setHoveredCategory(null)
    setMegaItems([])
    childrenCacheRef.current = {}
    brandsCacheRef.current = null
    const vitrine = shopGender ?? 'male'
    categoriesApi
      .list({ for_nav: true, shop_gender: vitrine })
      .then((res) => {
        const list = (res.data.results ?? res.data ?? []) as Array<{ id: number; name: string; slug?: string }>
        if (!cancelled) {
          const valid = list.filter((c) => typeof c?.id === 'number' && typeof c?.name === 'string')
          setTopCategories(filterNavCategories(valid))
        }
      })
      .catch(() => {
        if (!cancelled) setTopCategories([])
      })
    return () => {
      cancelled = true
    }
  }, [shopGender ?? 'male'])

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
      window.setTimeout(() => ghost.remove(), 700)
    }

    window.addEventListener('cart:item-added', onCartAdded as EventListener)
    return () => window.removeEventListener('cart:item-added', onCartAdded as EventListener)
  }, [])

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.topInner}>
          <nav className={styles.genderNav} aria-label="Выбор витрины" lang="ru">
            <button
              type="button"
              className={`${styles.genderTab} ${shopGender === 'male' ? styles.genderTabActive : ''}`}
              onClick={selectMale}
            >
              Для него
            </button>
            <button
              type="button"
              className={`${styles.genderTab} ${shopGender === 'female' ? styles.genderTabActive : ''}`}
              onClick={selectFemale}
            >
              Для неё
            </button>
          </nav>

          <Link to="/" className={styles.logo} aria-label="NGM — на главную">
            <img
              src={HEADER_LOGO_SRC}
              alt=""
              className={styles.logoImg}
              width={200}
              height={48}
              decoding="async"
            />
            <span className={styles.logoWordmark} lang="en">
              NGM
            </span>
          </Link>

          <div className={styles.utilities}>
            {sellerPending && (
              <span className={styles.sellerPending} lang="ru" title="Заявка на модерации">
                Модерация
              </span>
            )}
            {canCreateProducts && (
              <Link to="/products/new" className={styles.newLink} lang="en">
                New
              </Link>
            )}
            {canShowBecomeSeller && (
              <Link to="/seller/apply" className={styles.utilityLink} lang="ru">
                Стать продавцом
              </Link>
            )}

            {isLoading ? (
              <span className={styles.iconBtn} aria-hidden>
                <UserIcon />
              </span>
            ) : isAuthenticated ? (
              <div className={styles.profileMenu} ref={profileMenuRef}>
                <button
                  type="button"
                  className={`${styles.iconBtn} ${profileMenuOpen ? styles.iconBtnActive : ''}`}
                  title="Меню профиля"
                  aria-label="Меню профиля"
                  aria-expanded={profileMenuOpen}
                  aria-haspopup="menu"
                  onClick={() => setProfileMenuOpen((o) => !o)}
                >
                  <UserIcon />
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
                      Настройки
                    </Link>
                    <button
                      type="button"
                      className={styles.profileDropdownBtn}
                      role="menuitem"
                      onClick={handleLogout}
                      lang="ru"
                    >
                      Выход
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className={styles.authLinks}>
                <Link to="/login" className={styles.utilityLink}>
                  Login
                </Link>
                <Link to="/register" className={styles.utilityLinkAccent}>
                  Register
                </Link>
              </div>
            )}

            <Link
              ref={cartRef}
              to="/cart"
              className={`${styles.iconBtn} ${styles.cartBtn} ${isCartPulse ? styles.cartPulse : ''}`}
              data-cart-anchor
              aria-label="Корзина"
            >
              <svg
                className={styles.cartIcon}
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden
              >
                <path
                  d="M9 11V8a3 3 0 0 1 6 0v3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M4 11h16l-1.3 9H5.3L4 11z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="21" r="1.25" fill="currentColor" />
                <circle cx="16" cy="21" r="1.25" fill="currentColor" />
              </svg>
              {isAuthenticated && itemCount > 0 && (
                <span className={styles.cartBadge}>{itemCount}</span>
              )}
            </Link>
          </div>
        </div>
      </div>

      <div
        className={styles.bottomRow}
        onMouseEnter={cancelMegaClose}
        onMouseLeave={scheduleMegaClose}
      >
        <div className={styles.bottomInner}>
          <nav className={styles.categoryNav} aria-label="Категории" lang="ru">
            {topCategories.map((cat) => (
              <div
                key={cat.id}
                className={styles.categoryNavItem}
                onMouseEnter={() => handleCategoryEnter(cat)}
              >
                <Link
                  to={categoryHref(cat.id, cat.name)}
                  className={`${styles.categoryLink} ${
                    catalogCategoryId === cat.id ? styles.categoryLinkActive : ''
                  } ${hoveredCategory?.id === cat.id ? styles.categoryLinkHover : ''}`}
                >
                  {cat.name}
                </Link>
              </div>
            ))}
          </nav>
          <SearchBar className={styles.searchInHeader} />
        </div>

        {showMegaMenu && hoveredCategory && (
          <HeaderNavMegaMenu
            categoryName={hoveredCategory.name}
            viewAllHref={categoryHref(hoveredCategory.id, hoveredCategory.name)}
            items={megaItems}
            loading={megaLoading}
          />
        )}
      </div>

    </header>
  )
}
