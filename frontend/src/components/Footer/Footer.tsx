import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <p className={styles.slogan}>
          PRESENT IMAGINING FUTURE UNIFORMS ®
        </p>
        <div className={styles.brand}>
          <span className={styles.brandName}>NEXTGEN MARKET</span>
        </div>
        <div className={styles.links}>
          <Link to="/products">Products</Link>
        </div>
      </div>
    </footer>
  )
}
