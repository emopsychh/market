import { type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import { splitMegaMenuColumns } from '../../utils/categoryNav'
import styles from './HeaderNavMegaMenu.module.css'

export interface MegaMenuLink {
  key: string
  name: string
  href: string
}

interface HeaderNavMegaMenuProps {
  categoryName: string
  viewAllHref: string
  items: MegaMenuLink[]
  loading?: boolean
}

function columnCountFor(itemsLength: number): number {
  if (itemsLength > 24) return 5
  if (itemsLength > 16) return 4
  if (itemsLength > 8) return 3
  return itemsLength > 0 ? Math.min(2, itemsLength) : 0
}

export function HeaderNavMegaMenu({
  categoryName,
  viewAllHref,
  items,
  loading = false,
}: HeaderNavMegaMenuProps) {
  const columns = splitMegaMenuColumns(items, columnCountFor(items.length))

  return (
    <div
      className={styles.megaMenu}
      role="region"
      aria-label={`Подкатегории: ${categoryName}`}
      lang="ru"
    >
      <div className={styles.megaInner}>
        <Link to={viewAllHref} className={styles.viewAll}>
          Смотреть все — {categoryName}
        </Link>

        {loading ? (
          <p className={styles.loading}>Загрузка…</p>
        ) : items.length === 0 ? (
          <p className={styles.empty}>Пока нет подкатегорий</p>
        ) : (
          <div
            className={styles.columns}
            style={{ '--mega-cols': columns.length } as CSSProperties}
          >
            {columns.map((col) => (
              <ul key={col[0]?.key ?? 'col'} className={styles.column}>
                {col.map((item) => (
                  <li key={item.key}>
                    <Link to={item.href} className={styles.itemLink}>
                      {item.name}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
