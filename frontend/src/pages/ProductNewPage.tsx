import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
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

export function ProductNewPage() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([])
  const [categoriesLoading, setCategoriesLoading] = useState(true)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [sizes, setSizes] = useState('S, M, L')
  const [gender, setGender] = useState<'male' | 'female' | 'unisex'>('male')
  const [brand, setBrand] = useState(BRAND_OPTIONS[0]?.slug ?? '')
  const [images, setImages] = useState<File[]>([])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSell = user?.role === 'admin' || (user?.role === 'seller' && user?.seller_status === 'approved')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate('/login', { state: { from: '/products/new' } })
    }
  }, [isAuthenticated, isLoading, navigate])

  useEffect(() => {
    if (!isLoading && isAuthenticated && user && !canSell) {
      navigate('/products', { replace: true })
    }
  }, [isLoading, isAuthenticated, user, canSell, navigate])

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
        if (!cancelled) {
          setCategoryOptions(options)
          if (options.length && !categoryId) {
            setCategoryId(String(options[0].id))
          }
        }
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
      const { data } = await productsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum.toFixed(2),
        category: cat,
        sizes: parseList(sizes),
        colors: [],
        gender,
        brand,
        status: 'active',
      })

      const id = data.id as number
      for (const file of images) {
        await productsApi.addImage(id, file)
      }
      navigate(`/products/${id}`)
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
          : 'Не удалось создать товар'
      setError(typeof msg === 'string' ? msg : 'Ошибка сервера')
    } finally {
      setSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="container">
        <p className={styles.hint}>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user || !canSell) {
    return null
  }

  return (
    <div className="container">
      <div className={styles.wrap}>
        <h1 className={styles.title}>/products/new</h1>
        <p className={styles.hint}>
          После публикации товар сразу появляется в каталоге. Пол нужен, чтобы покупатели находили его в разделе
          «Мужчинам» или «Женщинам».
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
              {categoryOptions.length === 0 ? (
                <option value="">Нет категорий — создайте в админке</option>
              ) : (
                categoryOptions.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))
              )}
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
            <span className={styles.label} id="p-img-label">
              Фото (можно несколько)
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
                <span className={styles.fileHint}>Файлы не выбраны</span>
              )}
              <p className={styles.fileHelp}>
                Выберите несколько файлов за раз (Ctrl или Shift) — все фото будут в карточке товара и в каталоге.
              </p>
            </div>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button type="submit" className={styles.submit} disabled={submitting || categoryOptions.length === 0}>
              {submitting ? 'Сохранение…' : 'Опубликовать'}
            </button>
            <Link to="/products" className={styles.cancel}>
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
