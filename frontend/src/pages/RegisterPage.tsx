import { useState, FormEvent, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import styles from './AuthPages.module.css'

export function RegisterPage() {
  const { isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate('/')
  }, [isAuthenticated, isLoading, navigate])
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState<Record<string, string> | string>('')
  const [loading, setLoading] = useState(false)

  const { register } = useAuth()

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError({ password_confirm: 'Пароли не совпадают' })
      return
    }

    if (password.length < 8) {
      setError({ password: 'Минимум 8 символов' })
      return
    }

    setLoading(true)
    try {
      await register({
        email,
        username,
        password,
        password_confirm: passwordConfirm,
      })
      navigate('/')
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const data = (err as { response?: { data?: Record<string, string[]> } }).response?.data
        if (data && typeof data === 'object') {
          const messages: Record<string, string> = {}
          for (const [key, val] of Object.entries(data)) {
            if (Array.isArray(val) && val[0]) messages[key] = val[0]
          }
          setError(Object.keys(messages).length ? messages : 'Ошибка регистрации')
        } else {
          setError('Ошибка регистрации')
        }
      } else {
        setError('Ошибка регистрации')
      }
    } finally {
      setLoading(false)
    }
  }

  const getError = (field: string) =>
    typeof error === 'object' && error[field] ? error[field] : ''

  if (isLoading) return null

  return (
    <div key={location.pathname} className={`${styles.screen} page-enter`} lang="ru">
      <Link to="/" className={styles.back}>← На главную</Link>
      <div className={styles.wrapper}>
        <form className={styles.form} onSubmit={handleSubmit}>
          <h1 className={styles.title}>
            <span lang="en">/register</span>
          </h1>

        {typeof error === 'string' && error && <p className={styles.error}>{error}</p>}

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
          {getError('email') && <span className={styles.fieldError}>{getError('email')}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="username" className={styles.label}>Имя пользователя</label>
          <input
            id="username"
            type="text"
            className={styles.input}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          {getError('username') && <span className={styles.fieldError}>{getError('username')}</span>}
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
            minLength={8}
            autoComplete="new-password"
          />
          {getError('password') && <span className={styles.fieldError}>{getError('password')}</span>}
        </div>

        <div className={styles.field}>
          <label htmlFor="password_confirm" className={styles.label}>Подтверждение пароля</label>
          <input
            id="password_confirm"
            type="password"
            className={styles.input}
            value={passwordConfirm}
            onChange={(e) => setPasswordConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
          {getError('password_confirm') && <span className={styles.fieldError}>{getError('password_confirm')}</span>}
        </div>

        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? 'Регистрация...' : 'Зарегистрироваться'}
        </button>

        <p className={styles.footer}>
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </form>
      </div>
    </div>
  )
}
