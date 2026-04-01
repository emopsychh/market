import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate, Link, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { categoriesApi, productsApi } from '../api'
import { BRAND_OPTIONS } from '../constants/brands'
import styles from './ProductNewPage.module.css'

interface CategoryOption {
  id: number
  label: string
}

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
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loadingProduct, setLoadingProduct] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sizes, setSizes] = useState('S, M, L')
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('male')
  const [brand, setBrand] = useState(BRAND_OPTIONS[0]?.slug ?? '')
  const [status, setStatus] = useState<'active' | 'moderation' | 'inactive'>('active')
  const [images, setImages] = useState<File[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sellerId, setSellerId] = useState<number | null>(null)

  const canSell = user?.role === 'seller' || user?.role === 'admin'
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
    ;(async () => {
      try {
        const rootsRes = await categoriesApi.list()
        const roots = rootsRes.data.results ?? rootsRes.data ?? []
        const options: CategoryOption[] = []
        for (const r of roots) {
          const subRes = await categoriesApi.list({ parent: r.id })
          const children = subRes.data.results ?? subRes.data ?? []
          if (children.length === 0) {
            options.push({ id: r.id, label: r.name })
          } else {
            for (const c of children) {
              options.push({ id: c.id, label: `${r.name} — ${c.name}` })
            }
          }
        }
        if (!cancelled) setCategoryOptions(options)
      } catch {
        if (!cancelled) setCategoryOptions([])
      } finally {
        if (!cancelled) setCategoriesLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

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
          category: number
          sizes: string[]
          gender: string
          brand?: string
          status: string
          seller: number
        }
        setSellerId(p.seller)
        setName(p.name)
        setDescription(p.description ?? '')
        setPrice(String(p.price))
        setCategoryId(String(p.category))
        setSizes((p.sizes ?? []).join(', '))
        setGender(p.gender === 'female' ? 'female' : p.gender === 'unisex' ? 'unisex' : 'male')
        setBrand(p.brand || (BRAND_OPTIONS[0]?.slug ?? ''))
        setStatus(
          p.status === 'moderation' || p.status === 'inactive' ? p.status : 'active'
        )
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

    setSubmitting(true)
    try {
      await productsApi.update(productId, {
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum.toFixed(2),
        category: cat,
        sizes: parseList(sizes),
        colors: [],
        gender,
        brand,
        status,
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
        <p className={styles.hint}>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user || !canSell) {
    return null
  }

  if (loadError) {
    return (
      <div className="container">
        <p className={styles.error}>{loadError}</p>
        <Link to="/profile" className={styles.cancel}>
          В профиль
        </Link>
      </div>
    )
  }

  return (
    <div className="container">
      <div className={styles.wrap}>
        <h1 className={styles.title}>/products/{id}/edit</h1>
        <p className={styles.hint}>
          Изменения сразу отображаются в каталоге. Пол определяет, в каком разделе — «Мужчинам» или «Женщинам» —
          увидят товар покупатели.
        </p>

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-name">
              Название
            </label>
            <input
              id="p-name"
              className={styles.input}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={200}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-desc">
              Описание
            </label>
            <textarea
              id="p-desc"
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              spellCheck={false}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-price">
              Цена (₽)
            </label>
            <input
              id="p-price"
              className={styles.input}
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-cat">
              Категория
            </label>
            <select
              id="p-cat"
              className={styles.select}
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={categoriesLoading || categoryOptions.length === 0}
              required
            >
              {categoryOptions.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <span className={styles.label}>Пол</span>
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
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-brand">
              Бренд
            </label>
            <select
              id="p-brand"
              className={styles.select}
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              required
            >
              {BRAND_OPTIONS.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-sizes">
              Размеры (через запятую)
            </label>
            <input
              id="p-sizes"
              className={styles.input}
              value={sizes}
              onChange={(e) => setSizes(e.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="p-status">
              Статус
            </label>
            <select
              id="p-status"
              className={styles.select}
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as 'active' | 'moderation' | 'inactive')
              }
            >
              <option value="active">Активен</option>
              <option value="moderation">На модерации</option>
              <option value="inactive">Неактивен</option>
            </select>
          </div>

          <div className={styles.field}>
            <span className={styles.label} id="p-img-label">
              Добавить фото
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
              <label htmlFor="p-img" className={styles.filePickBtn}>
                Прикрепить
              </label>
              {images.length > 0 ? (
                <ul className={styles.fileList}>
                  {images.map((f) => (
                    <li key={`${f.name}-${f.size}`}>{f.name}</li>
                  ))}
                </ul>
              ) : (
                <span className={styles.fileHint}>Новые файлы не выбраны</span>
              )}
              <p className={styles.fileHelp}>
                Можно выбрать несколько изображений за раз — они добавятся к уже загруженным.
              </p>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={submitting || categoryOptions.length === 0}>
              {submitting ? 'Сохранение…' : 'Сохранить'}
            </button>
            <Link to={`/products/${productId}`} className={styles.cancel}>
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
