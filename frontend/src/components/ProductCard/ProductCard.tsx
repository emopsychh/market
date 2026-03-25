import { Link } from 'react-router-dom'
import { formatPriceRub } from '../../utils/price'
import styles from './ProductCard.module.css'

export interface Product {
  id: number
  name: string
  price: string
  category: number
  category_name: string
  sizes: string[]
  colors: string[]
  gender?: 'male' | 'female' | 'unisex'
  first_image: string | null
  preview_images?: string[]
  images_count?: number
  status: string
}

interface ProductCardProps {
  product: Product
}

function getPreviewUrls(product: Product): string[] {
  if (product.preview_images?.length) return product.preview_images
  if (product.first_image) return [product.first_image]
  return []
}

export function ProductCard({ product }: ProductCardProps) {
  const urls = getPreviewUrls(product)
  const total = product.images_count ?? urls.length
  const extra = total > 4 ? total - 4 : 0

  return (
    <Link to={`/products/${product.id}`} className={styles.card}>
      <div className={styles.imageWrap}>
        {urls.length === 0 ? (
          <div className={styles.placeholder}>/no image</div>
        ) : urls.length === 1 ? (
          <img src={urls[0]} alt={product.name} className={styles.image} />
        ) : urls.length === 2 ? (
          <div className={styles.grid2}>
            <img src={urls[0]} alt="" className={styles.cell} />
            <img src={urls[1]} alt="" className={styles.cell} />
          </div>
        ) : urls.length === 3 ? (
          <div className={styles.grid3}>
            <img src={urls[0]} alt="" className={styles.cell} />
            <img src={urls[1]} alt="" className={styles.cell} />
            <img src={urls[2]} alt="" className={styles.cellWide} />
          </div>
        ) : (
          <div className={styles.grid4}>
            {urls.slice(0, 4).map((src, i) => (
              <div key={src} className={styles.grid4Cell}>
                <img src={src} alt="" className={styles.cell} />
                {i === 3 && extra > 0 && (
                  <span className={styles.moreBadge}>+{extra}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={styles.info}>
        <span className={styles.name}>{product.name}</span>
        <span className={styles.price}>{formatPriceRub(product.price)}</span>
      </div>
    </Link>
  )
}
