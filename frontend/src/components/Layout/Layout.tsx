import { Outlet, useLocation } from 'react-router-dom'
import { Header } from '../Header/Header'
import { Footer } from '../Footer/Footer'
import { layoutOutletKey } from '../../utils/layoutOutletKey'
import styles from './Layout.module.css'

export function Layout() {
  const { pathname } = useLocation()

  return (
    <div className={styles.layout}>
      <Header />
      <main className={styles.main} lang="ru">
        <div key={layoutOutletKey(pathname)} className={`${styles.pageEnter} page-enter`}>
          <Outlet />
        </div>
      </main>
      <Footer />
    </div>
  )
}
