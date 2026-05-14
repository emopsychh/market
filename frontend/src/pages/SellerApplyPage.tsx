import { useEffect, useState, FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authApi, type SellerApplicationPayload } from '../api'
import styles from './SellerApplyPage.module.css'

const SELLER_TYPES: { value: SellerApplicationPayload['seller_type']; label: string }[] = [
  { value: 'individual', label: 'Физическое лицо' },
  { value: 'self_employed', label: 'Самозанятый' },
  { value: 'ie', label: 'ИП' },
  { value: 'llc', label: 'Юридическое лицо' },
]

export function SellerApplyPage() {
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [sellerType, setSellerType] = useState<SellerApplicationPayload['seller_type']>('individual')
  const [displayName, setDisplayName] = useState('')
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [country, setCountry] = useState('Россия')
  const [description, setDescription] = useState('')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isApprovedSeller =
    user?.role === 'admin' || (user?.role === 'seller' && user?.seller_status === 'approved')
  const isPending = user?.role === 'seller' && user?.seller_status === 'pending'

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/seller/apply' } })
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (isLoading || !user) return
    if (isApprovedSeller || isPending) {
      navigate('/profile', { replace: true })
    }
  }, [isLoading, user, isApprovedSeller, isPending, navigate])

  useEffect(() => {
    if (user?.phone) setPhone((prev) => (prev ? prev : user.phone ?? ''))
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!termsAccepted) {
      setError('Нужно принять правила площадки')
      return
    }
    if (!displayName.trim() || !fullName.trim() || !phone.trim() || !city.trim() || !description.trim()) {
      setError('Заполните обязательные поля')
      return
    }

    const payload: SellerApplicationPayload = {
      seller_type: sellerType,
      display_name: displayName.trim(),
      full_name: fullName.trim(),
      phone: phone.trim(),
      city: city.trim(),
      country: country.trim() || 'Россия',
      description: description.trim(),
      terms_accepted: true,
    }

    setSubmitting(true)
    try {
      await authApi.sellerApplication(payload)
      await refreshUser()
      navigate('/profile', { replace: true })
    } catch (err: unknown) {
      const data = (err as { response?: { data?: { detail?: string } } })?.response?.data
      setError(typeof data?.detail === 'string' ? data.detail : 'Не удалось отправить заявку')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || !user) return null
  if (isApprovedSeller || isPending) return null

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>/seller/apply</h1>
      <p className={styles.hint}>
        Заполните анкету: данные увидит модератор. После одобрения вы сможете публиковать товары.
      </p>

      <form className={styles.form} onSubmit={handleSubmit}>
        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="seller_type">Тип продавца</label>
          <select
            id="seller_type"
            className={styles.select}
            value={sellerType}
            onChange={(e) => setSellerType(e.target.value as SellerApplicationPayload['seller_type'])}
          >
            {SELLER_TYPES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="display_name">Публичное название магазина</label>
          <input
            id="display_name"
            className={styles.input}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={120}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="full_name">ФИО контактного лица</label>
          <input
            id="full_name"
            className={styles.input}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            maxLength={200}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="phone">Телефон для связи</label>
          <input
            id="phone"
            type="tel"
            className={styles.input}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="city">Город</label>
          <input id="city" className={styles.input} value={city} onChange={(e) => setCity(e.target.value)} required />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="country">Страна</label>
          <input
            id="country"
            className={styles.input}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="description">Описание деятельности</label>
          <textarea
            id="description"
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        <label className={styles.checkboxRow}>
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
          />
          <span>
            Я принимаю правила площадки и даю согласие на обработку указанных данных для рассмотрения заявки.
          </span>
        </label>

        <div className={styles.actions}>
          <button type="submit" className={styles.submit} disabled={submitting}>
            {submitting ? 'Отправка…' : 'Отправить заявку'}
          </button>
          <Link to="/profile" className={styles.back}>
            Назад в профиль
          </Link>
        </div>
      </form>
    </div>
  )
}
