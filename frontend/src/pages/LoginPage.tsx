import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './AuthPages.module.css'

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(from, { replace: true })
  }, [isAuthenticated, isLoading, navigate, from])
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate(from, { replace: true })
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'response' in err
        ? (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
        : 'Ошибка входа'
      setError(typeof msg === 'string' ? msg : 'Неверный email или пароль')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return null

  return (
    <div className={styles.screen} lang="ru">
      <Link to="/" className={styles.back}>← На главную</Link>
      <div className={styles.wrapper}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h1 className={styles.title}>
            <span lang="en">/login</span>
          </h1>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label htmlFor="email" className={styles.label} lang="en">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={styles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="password" className={styles.label}>Пароль</label>
          <input
            id="password"
            type="password"
            className={styles.input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? 'Вход...' : 'Войти'}
        </button>

        <p className={styles.footer}>
          Нет аккаунта? <Link to="/register">Регистрация</Link>
        </p>
      </form>
      </div>
    </div>
  )
}
