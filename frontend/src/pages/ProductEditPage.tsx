import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { productsApi } from '../api'
import { useBrands } from '../hooks/useBrands'
import {
  loadProductCategoryOptions,
  resolveCategoryId,
  type ProductCategoryOption,
} from '../utils/productCategoryOptions'
import shared from './profile/profileShared.module.css'
import styles from './ProductNewPage.module.css'

function parseList(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function ProductEditPage() {
  const { id } = useParams()
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [categoryOptions, setCategoryOptions] = useState<ProductCategoryOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [compareAtPrice, setCompareAtPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sizes, setSizes] = useState('S, M, L')
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('male')
  const { brands, loading: brandsLoading } = useBrands()
  const [brand, setBrand] = useState('')
  const [status, setStatus] = useState<'active' | 'moderation' | 'inactive'>('active')
  const [publicationStatus, setPublicationStatus] = useState<string | null>(null)
  const [images, setImages] = useState<File[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sellerId, setSellerId] = useState<number | null>(null)

  const isAdmin = user?.role === 'admin'
  const canSell = isAdmin || (user?.role === 'seller' && user?.seller_status === 'approved')
  const productId = id ? parseInt(id, 10) : NaN

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: `/products/${id}/edit` } })
    }
  }, [isAuthenticated, isLoading, navigate, id])

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !canSell) {
      navigate('/products', { replace: true })
    }
  }, [isLoading, isAuthenticated, user, canSell, navigate])

  useEffect(() => {
    if (!isLoading && user && sellerId !== null && sellerId !== user.id && user.role !== 'admin') {
      navigate('/products', { replace: true })
    }
  }, [isLoading, user, sellerId, navigate])

  useEffect(() => {
    let cancelled = false
    setCategoriesLoading(true)
    void loadProductCategoryOptions(gender)
      .then((options) => {
        if (cancelled) return
        setCategoryOptions(options)
        setCategoryId((prev) => resolveCategoryId(prev, options))
      })
      .catch(() => {
        if (!cancelled) setCategoryOptions([])
      })
      .finally(() => {
        if (!cancelled) setCategoriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [gender])

  useEffect(() => {
    if (!id || Number.isNaN(productId)) {
      setLoadError('Некорректная ссылка')
      setLoadingProduct(false)
      return
    }
    let cancelled = false
    setLoadingProduct(true)
    setLoadError(null)
    productsApi
      .detail(productId)
      .then(({ data }) => {
        if (cancelled) return
        const p = data as {
          name: string
          description: string
          price: string
          compare_at_price?: string | null
          category: number
          sizes: string[]
          gender: string
          brand?: string
          status: string
          publication_status?: string
          seller: number
        }
        setSellerId(p.seller)
        setPublicationStatus(p.publication_status ?? null)
        setName(p.name)
        setDescription(p.description ?? '')
        setPrice(String(p.price))
        setCompareAtPrice(p.compare_at_price != null && p.compare_at_price !== '' ? String(p.compare_at_price) : '')
        setCategoryId(String(p.category))
        setSizes((p.sizes ?? []).join(', '))
        setGender(p.gender === 'female' ? 'female' : p.gender === 'unisex' ? 'unisex' : 'male')
        setBrand(p.brand ?? '')
        const admin = user?.role === 'admin'
        if (admin) {
          setStatus(
            p.status === 'moderation' || p.status === 'inactive' ? p.status : 'active',
          )
        } else {
          setStatus(p.status === 'inactive' ? 'inactive' : 'active')
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError('Товар не найден')
      })
      .finally(() => {
        if (!cancelled) setLoadingProduct(false)
      })
    return () => {
      cancelled = true
    }
  }, [id, productId, user, navigate])

  const handleFiles = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files?.length) return
    setImages(Array.from(files))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const cat = parseInt(categoryId, 10)
    if (!name.trim() || !price.trim() || Number.isNaN(cat)) {
      setError('Укажите название, цену и категорию')
      return
    }
    const priceNum = parseFloat(price.replace(',', '.'))
    if (Number.isNaN(priceNum) || priceNum <= 0) {
      setError('Некорректная цена')
      return
    }

    const compareRaw = compareAtPrice.trim()
    let comparePayload: string | null
    if (!compareRaw) {
      comparePayload = null
    } else {
      const c = parseFloat(compareRaw.replace(',', '.'))
      if (Number.isNaN(c) || c <= priceNum) {
        setError('«Цена до скидки» должна быть выше текущей цены')
        return
      }
      comparePayload = c.toFixed(2)
    }

    setSubmitting(true)
    try {
      await productsApi.update(productId, {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum.toFixed(2),
        compare_at_price: comparePayload,
        category: cat,
        sizes: parseList(sizes),
        colors: [],
        gender,
        brand: brand || undefined,
        status: isAdmin ? status : status === 'inactive' ? 'inactive' : 'active',
      })
      for (const file of images) {
        await productsApi.addImage(productId, file)
      }
      navigate(`/products/${productId}`)
    } catch (err: unknown) {
      const msg =
        err &&
        typeof err === 'object' &&
        'response' in err &&
        err.response &&
        typeof err.response === 'object' &&
        'data' in err.response &&
        err.response.data &&
        typeof err.response.data === 'object'
          ? (err.response.data as { detail?: string }).detail ||
            JSON.stringify(err.response.data)
          : 'Не удалось сохранить'
      setError(typeof msg === 'string' ? msg : 'Ошибка сервера')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading || loadingProduct) {
    return (
      <div className="container">
        <p className={styles.loadingHint}>Загрузка…</p>
      </div>
    )
  }

  if (!isAuthenticated || !user || !canSell) {
    return null
  }

  if (loadError) {
    return (
      <div className="container">
        <p className={shared.errorBox}>{loadError}</p>
        <Link to="/profile" className={shared.sellerBtn}>
          В профиль
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div className={styles.page}>
        <header className={styles.head}>
          <p className={shared.pageKicker} lang="en">
            /products/{id}/edit
          </p>
          <h1 className={shared.pageTitle}>Редактирование товара</h1>
          <p className={styles.lead}>
            Пол — витрина «Для него» / «Для неё». Тип товара — одежда, обувь и т.д. Новые фото добавляются к уже загруженным.
          </p>
        </header>

        <form className={styles.formStack} onSubmit={handleSubmit}>
          <section className={shared.panel} aria-labelledby="edit-main-heading">
            <h2 id="edit-main-heading" className={shared.sectionTitle}>
              Основное
            </h2>
            <div className={shared.field}>
              <label className={shared.label} htmlFor="p-name">
                Название
              </label>
              <input
                id="p-name"
                className={shared.input}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={200}
              />
            </div>
            <div className={shared.field}>
              <label className={shared.label} htmlFor="p-desc">
                Описание
              </label>
              <textarea
                id="p-desc"
                className={shared.textarea}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                spellCheck={false}
                rows={4}
              />
            </div>
          </section>

          <section className={shared.panel} aria-labelledby="edit-gender-heading">
            <h2 id="edit-gender-heading" className={shared.sectionTitle}>
              Витрина
            </h2>
            <p className={styles.fieldHint} style={{ marginTop: 0, marginBottom: 12 }}>
              Куда попадёт товар — «Для него» или «Для неё». Список типов товара ниже зависит от этого выбора.
            </p>
            <div className={styles.genderRow}>
              <label className={styles.genderOption}>
                <input
                  type="radio"
                  name="gender"
                  value="male"
                  checked={gender === 'male'}
                  onChange={() => setGender('male')}
                />
                <span>Мужской</span>
              </label>
              <label className={styles.genderOption}>
                <input
                  type="radio"
                  name="gender"
                  value="female"
                  checked={gender === 'female'}
                  onChange={() => setGender('female')}
                />
                <span>Женский</span>
              </label>
              <label className={styles.genderOption}>
                <input
                  type="radio"
                  name="gender"
                  value="unisex"
                  checked={gender === 'unisex'}
                  onChange={() => setGender('unisex')}
                />
                <span>Унисекс</span>
              </label>
            </div>
          </section>

          <section className={shared.panel} aria-labelledby="edit-catalog-heading">
            <h2 id="edit-catalog-heading" className={shared.sectionTitle}>
              Цена и каталог
            </h2>
            <div className={styles.row2}>
              <div className={shared.field}>
                <label className={shared.label} htmlFor="p-price">
                  Цена (₽)
                </label>
                <input
                  id="p-price"
                  className={shared.input}
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
              <div className={shared.field}>
                <label className={shared.label} htmlFor="p-cat">
                  Тип товара
                </label>
                <select
                  id="p-cat"
                  className={shared.select}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categoriesLoading || categoryOptions.length === 0}
                  required
                  aria-describedby="p-cat-hint"
                >
                  {categoryOptions.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span id="p-cat-hint" className={styles.fieldHint}>
                  Одежда, обувь и т.д. — не «Для него» / «Для неё»
                </span>
              </div>
            </div>
            <div className={shared.field}>
              <label className={shared.label} htmlFor="p-compare">
                Цена до скидки (₽)
              </label>
              <input
                id="p-compare"
                className={shared.input}
                inputMode="decimal"
                value={compareAtPrice}
                onChange={(e) => setCompareAtPrice(e.target.value)}
                placeholder="необязательно"
                aria-describedby="p-compare-hint"
              />
              <span id="p-compare-hint" className={styles.fieldHint}>
                Выше текущей цены — зачёркнутая цена и скидка в витрине
              </span>
            </div>
            <div className={styles.row2}>
              <div className={shared.field}>
                <label className={shared.label} htmlFor="p-brand">
                  Бренд
                </label>
                <select
                  id="p-brand"
                  className={shared.select}
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  disabled={brandsLoading || brands.length === 0}
                >
                  {brandsLoading && <option value="">Загрузка…</option>}
                  {!brandsLoading && brands.length === 0 && (
                    <option value="">Нет брендов в каталоге</option>
                  )}
                  {brands.map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className={shared.field}>
                <label className={shared.label} htmlFor="p-sizes">
                  Размеры
                </label>
                <input
                  id="p-sizes"
                  className={shared.input}
                  value={sizes}
                  onChange={(e) => setSizes(e.target.value)}
                  placeholder="S, M, L"
                  aria-describedby="p-sizes-hint"
                />
                <span id="p-sizes-hint" className={styles.fieldHint}>
                  через запятую
                </span>
              </div>
            </div>
            <div className={shared.field}>
              <label className={shared.label} htmlFor="p-status">
                {isAdmin ? 'Статус' : 'Витрина'}
              </label>
              <select
                id="p-status"
                className={shared.select}
                value={isAdmin ? status : status === 'inactive' ? 'inactive' : 'active'}
                onChange={(e) =>
                  setStatus(e.target.value as 'active' | 'moderation' | 'inactive')
                }
              >
                <option value="active">{isAdmin ? 'Активен' : 'Показывать в каталоге'}</option>
                {isAdmin && <option value="moderation">На модерации</option>}
                <option value="inactive">{isAdmin ? 'Неактивен' : 'Скрыть с витрины'}</option>
              </select>
              {!isAdmin && publicationStatus === 'pending_review' && (
                <span className={styles.fieldHint}>
                  После сохранения карточка снова уйдёт на проверку модератору
                </span>
              )}
              {!isAdmin && publicationStatus === 'rejected' && (
                <span className={styles.fieldHint}>
                  Товар отклонён — исправьте данные и сохраните для повторной проверки
                </span>
              )}
            </div>
          </section>


          <section className={shared.panel} aria-labelledby="edit-photos-heading">
            <h2 id="edit-photos-heading" className={shared.sectionTitle}>
              Фото
            </h2>
            <div className={shared.field}>
              <span className={shared.label} id="p-img-label">
                Добавить
              </span>
              <div className={styles.fileBlock}>
                <input
                  id="p-img"
                  className={styles.fileHidden}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFiles}
                  aria-labelledby="p-img-label"
                />
                <label htmlFor="p-img" className={shared.sellerBtn}>
                  Выбрать файлы
                </label>
                {images.length > 0 ? (
                  <ul className={styles.fileList}>
                    {images.map((f) => (
                      <li key={`${f.name}-${f.size}`}>{f.name}</li>
                    ))}
                  </ul>
                ) : (
                  <span className={styles.fileHint}>новые не выбраны</span>
                )}
                <p className={styles.fileHelp}>
                  Несколько файлов за раз — добавятся к уже загруженным на карточке.
                </p>
              </div>
            </div>
          </section>

          {error && <p className={shared.errorBox}>{error}</p>}

          <div className={styles.actions}>
            <button
              type="submit"
              className={`${shared.submit} ${shared.submitTight}`}
              disabled={submitting || categoryOptions.length === 0}
            >
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
            <Link to={`/products/${productId}`} className={shared.sellerBtn}>
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
