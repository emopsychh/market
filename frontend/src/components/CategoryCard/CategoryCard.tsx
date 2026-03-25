import { Link } from 'react-router-dom'
import styles from './CategoryCard.module.css'

export interface Category {
  id: number
  name: string
  slug: string
  parent: number | null
  order: number
}

interface CategoryCardProps {
  category: Category
  index?: number
}

export function CategoryCard({ category, index }: CategoryCardProps) {
  return (
    <Link
      to={`/products?category=${category.id}&category_name=${encodeURIComponent(category.name)}`}
      className={styles.card}
    >
      {index !== undefined && (
        <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
      )}
      <span className={styles.name}>/{category.slug}</span>
    </Link>
  )
}
