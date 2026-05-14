import { useEffect, useState, FormEvent, ChangeEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { categoriesApi, productsApi } from '../api'
import { BRAND_OPTIONS } from '../constants/brands'
import shared from './profile/profileShared.module.css'
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
  const [compareAtPrice, setCompareAtPrice] = useState('')
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

    const compareRaw = compareAtPrice.trim()
    let compareAt: string | undefined
    if (compareRaw) {
      const c = parseFloat(compareRaw.replace(',', '.'))
      if (Number.isNaN(c) || c <= priceNum) {
        setError('«Цена до скидки» должна быть выше текущей цены')
        return
      }
      compareAt = c.toFixed(2)
    }

    setSubmitting(true)
    try {
      const { data } = await productsApi.create({
        name: name.trim(),
        description: description.trim() || undefined,
        price: priceNum.toFixed(2),
        ...(compareAt ? { compare_at_price: compareAt } : {}),
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
        <p className={styles.loadingHint}>Загрузка...</p>
      </div>
    )
  }

  if (!isAuthenticated || !user || !canSell) {
    return null
  }

  return (
    <div className="container">
      <div className={styles.page}>
        <header className={styles.head}>
          <p className={shared.pageKicker} lang="en">
            /products/new
          </p>
          <h1 className={shared.pageTitle}>Новый товар</h1>
          <p className={styles.lead}>
            После публикации карточка сразу в каталоге. Пол нужен для разделов «Мужчинам» / «Женщинам».
          </p>
        </header>

        <form className={styles.formStack} onSubmit={handleSubmit}>
          <section className={shared.panel} aria-labelledby="product-main-heading">
            <h2 id="product-main-heading" className={shared.sectionTitle}>
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

          <section className={shared.panel} aria-labelledby="product-catalog-heading">
            <h2 id="product-catalog-heading" className={shared.sectionTitle}>
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
                  Категория
                </label>
                <select
                  id="p-cat"
                  className={shared.select}
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  disabled={categoriesLoading || categoryOptions.length === 0}
                  required
                >
                  {categoryOptions.length === 0 ? (
                    <option value="">Нет категорий</option>
                  ) : (
                    categoryOptions.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.label}
                      </option>
                    ))
                  )}
                </select>
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
                Если выше текущей цены — в витрине покажем зачёркнутую цену и скидку
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
                  required
                >
                  {BRAND_OPTIONS.map((item) => (
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
          </section>

          <section className={shared.panel} aria-labelledby="product-gender-heading">
            <h2 id="product-gender-heading" className={shared.sectionTitle}>
              Пол
            </h2>
            <div className={styles.genderRow}>
              <label className={styles.genderOption}>
                <input type="radio" name="gender" value="male" checked={gender === 'male'} onChange={() => setGender('male')} />
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

          <section className={shared.panel} aria-labelledby="product-photos-heading">
            <h2 id="product-photos-heading" className={shared.sectionTitle}>
              Фото
            </h2>
            <div className={shared.field}>
              <span className={shared.label} id="p-img-label">
                Загрузка
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
                  <span className={styles.fileHint}>не выбрано</span>
                )}
                <p className={styles.fileHelp}>Несколько файлов за раз (Ctrl / Shift) — сетка превью в карточке.</p>
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
              {submitting ? 'Сохранение…' : 'Опубликовать'}
            </button>
            <Link to="/products" className={shared.sellerBtn}>
              Отмена
            </Link>
          </div>
        </form>
      </div>
    </div>
  )
}
