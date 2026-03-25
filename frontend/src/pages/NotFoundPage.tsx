import { Link } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export function NotFoundPage() {
  return (
    <div className={styles.screen}>
      <div className={styles.grid} aria-hidden>
        <span className={styles.coordX}>A</span>
        <span className={styles.coordX}>B</span>
        <span className={styles.coordX}>C</span>
        <span className={styles.coordY}>1</span>
        <span className={styles.coordY}>2</span>
        <span className={styles.coordY}>3</span>
      </div>

      <div className={styles.content}>
        <span className={styles.code}>HTTP 404</span>
        <h1 className={styles.title}>404</h1>
        <p className={styles.subtitle}>PAGE NOT FOUND</p>
        <p className={styles.desc}>
          The requested resource could not be located.
          <br />
          <span className={styles.mono}>ERROR_CODE: NOT_FOUND</span>
        </p>
        <Link to="/" className={styles.back}>
          ← RETURN TO HOME
        </Link>
      </div>
    </div>
  )
}
