import { useState, FormEvent, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import styles from './SearchBar.module.css'

export function SearchBar() {
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
    <form className={styles.form} onSubmit={handleSubmit}>
      <input
        type="search"
        className={styles.input}
        placeholder="/search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Поиск товаров"
      />
      <button type="submit" className={styles.button} aria-label="Искать">
        →
      </button>
    </form>
  )
}
