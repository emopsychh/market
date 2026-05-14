import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './SearchBar.module.css'

interface SearchBarProps {
  /** Доп. класс к форме (например компактная ширина в шапке) */
  className?: string
}

export function SearchBar({ className }: SearchBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const params = new URLSearchParams(location.search)
  const searchFromUrl = params.get('search') ?? ''
  const [query, setQuery] = useState(searchFromUrl)

  useEffect(() => {
    if (location.pathname === '/products') {
      setQuery(searchFromUrl)
    }
  }, [location.pathname, searchFromUrl])

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = query.trim()
    if (trimmed) {
      navigate(`/products?search=${encodeURIComponent(trimmed)}`)
    } else {
      navigate('/products')
    }
  }

  return (
    <form className={[styles.form, className].filter(Boolean).join(' ')} onSubmit={handleSubmit}>
      <input
        type="search"
        className={styles.input}
        placeholder="Поиск…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Поиск товаров"
        autoComplete="off"
      />
      <button type="submit" className={styles.button} aria-label="Искать">
        <svg className={styles.buttonIcon} viewBox="0 0 24 24" aria-hidden>
          <circle cx="10.5" cy="10.5" r="5.5" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M15 15l5 5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  )
}
