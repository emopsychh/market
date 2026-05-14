import { useEffect, useState, FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { authApi } from '../../api'
import { isAxiosError } from 'axios'
import styles from './profileShared.module.css'

interface DeliveryAddress {
  id: number
  city: string
  street: string
  building: string
  apartment?: string
  postal_code?: string
  is_default?: boolean
}

function formatApiErrors(data: unknown): string {
  if (!data || typeof data !== 'object') return 'Не удалось сохранить. Попробуй ещё раз.'
  const parts: string[] = []
  for (const [, v] of Object.entries(data as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(v.map(String).join(', '))
    else if (typeof v === 'string') parts.push(v)
  }
  return parts.length ? parts.join(' ') : 'Не удалось сохранить. Попробуй ещё раз.'
}

export function AccountSettingsPage() {
  const { user, refreshUser } = useAuth()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')

  const [addresses, setAddresses] = useState<DeliveryAddress[]>([])
  const [addressesLoading, setAddressesLoading] = useState(false)
  const [addressSaving, setAddressSaving] = useState(false)
  const [addressDeletingId, setAddressDeletingId] = useState<number | null>(null)

  const [city, setCity] = useState('')
  const [street, setStreet] = useState('')
  const [building, setBuilding] = useState('')
  const [apartment, setApartment] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [isDefaultAddress, setIsDefaultAddress] = useState(false)

  const isApprovedSeller = user?.role === 'admin' || (user?.role === 'seller' && user?.seller_status === 'approved')

  const sellerStatusLabel = !user
    ? ''
    : (() => {
        if (user.role === 'admin') return 'Администратор'
        if (user.role === 'seller' && user.seller_status === 'approved') return 'Продавец (подтвержден)'
        if (user.role === 'seller' && user.seller_status === 'pending') return 'Заявка продавца на модерации'
        if (user.role === 'seller' && user.seller_status === 'rejected') return 'Заявка продавца отклонена'
        return 'Покупатель'
      })()

  const loadAddresses = async () => {
    setAddressesLoading(true)
    try {
      const { data } = await authApi.getAddresses()
      setAddresses(Array.isArray(data) ? (data as DeliveryAddress[]) : [])
    } finally {
      setAddressesLoading(false)
    }
  }

  useEffect(() => {
    if (!user) return
    loadAddresses()
  }, [user])

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name ?? '')
      setLastName(user.last_name ?? '')
      setPhone(user.phone ?? '')
    }
  }, [user])

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!user) return
    setSaving(true)
    setSaved(false)
    try {
      await authApi.updateMe({
        first_name: firstName,
        last_name: lastName,
        phone,
      })
      await refreshUser()
      setSaved(true)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordSaving(true)
    setPasswordMessage('')
    setPasswordError('')
    try {
      await authApi.changePassword({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      })
      setPasswordMessage('Пароль обновлён.')
      setCurrentPassword('')
      setNewPassword('')
      setNewPasswordConfirm('')
    } catch (err) {
      if (isAxiosError(err) && err.response?.data) {
        setPasswordError(formatApiErrors(err.response.data))
      } else {
        setPasswordError('Не удалось сменить пароль.')
      }
    } finally {
      setPasswordSaving(false)
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

  if (!user) return null

  return (
    <div className={styles.settingsGrid}>
      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>Контакты</h2>
        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <span className={styles.label}>Email</span>
            <span className={styles.value}>{user.email}</span>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Роль</label>
            <span className={styles.value}>{sellerStatusLabel}</span>
            {user.role !== 'admin' && !isApprovedSeller && (
              <div className={styles.roleOptions}>
                {user.seller_status === 'pending' ? (
                  <span className={styles.value}>Заявка отправлена, ожидайте решения модератора.</span>
                ) : (
                  <Link to="/seller/apply" className={styles.sellerBtn}>
                    {user.seller_status === 'rejected' ? 'Подать заявку снова' : 'Стать продавцом'}
                  </Link>
                )}
                {user.seller_status === 'rejected' && user.seller_rejection_reason && (
                  <p className={styles.sellerHint}>Причина: {user.seller_rejection_reason}</p>
                )}
              </div>
            )}
          </div>
          <div className={styles.field}>
            <label htmlFor="settings_first_name" className={styles.label}>
              Имя
            </label>
            <input
              id="settings_first_name"
              type="text"
              className={styles.input}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="settings_last_name" className={styles.label}>
              Фамилия
            </label>
            <input
              id="settings_last_name"
              type="text"
              className={styles.input}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="settings_phone" className={styles.label}>
              Телефон
            </label>
            <input
              id="settings_phone"
              type="tel"
              className={styles.input}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>
          <button type="submit" className={styles.submit} disabled={saving}>
            {saving ? 'Сохранение...' : 'Сохранить'}
          </button>
          {saved && <p className={styles.saved}>Сохранено</p>}
        </form>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>Пароль</h2>
        <form onSubmit={handlePasswordSubmit}>
          <div className={styles.field}>
            <label htmlFor="settings_current_pw" className={styles.label}>
              Текущий пароль
            </label>
            <input
              id="settings_current_pw"
              type="password"
              className={styles.input}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="settings_new_pw" className={styles.label}>
              Новый пароль
            </label>
            <input
              id="settings_new_pw"
              type="password"
              className={styles.input}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="settings_new_pw2" className={styles.label}>
              Повтор нового пароля
            </label>
            <input
              id="settings_new_pw2"
              type="password"
              className={styles.input}
              value={newPasswordConfirm}
              onChange={(e) => setNewPasswordConfirm(e.target.value)}
              autoComplete="new-password"
              required
              minLength={8}
            />
          </div>
          <button type="submit" className={styles.submit} disabled={passwordSaving}>
            {passwordSaving ? 'Сохранение...' : 'Обновить пароль'}
          </button>
          {passwordMessage && <p className={styles.saved}>{passwordMessage}</p>}
          {passwordError && <p className={styles.errorBox}>{passwordError}</p>}
        </form>
      </div>

      <div className={`${styles.panel} ${styles.settingsGridWide}`}>
        <h2 className={styles.sectionTitle}>Адреса доставки</h2>
        {addressesLoading ? (
          <p className={styles.sellerHint}>Загрузка...</p>
        ) : addresses.length === 0 ? (
          <p className={styles.sellerHint}>Сохранённых адресов пока нет.</p>
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
            <input type="checkbox" checked={isDefaultAddress} onChange={(e) => setIsDefaultAddress(e.target.checked)} />
            <span>Сделать адресом по умолчанию</span>
          </label>
          <button type="submit" className={styles.submit} disabled={addressSaving}>
            {addressSaving ? 'Сохранение...' : 'Добавить адрес'}
          </button>
        </form>
      </div>
    </div>
  )
}
