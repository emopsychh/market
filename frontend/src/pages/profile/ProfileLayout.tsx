import { useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import layoutStyles from './ProfileLayout.module.css'
import sharedStyles from './profileShared.module.css'

export function ProfileLayout() {
  const { user, isAuthenticated, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const isSettings = location.pathname.endsWith('/settings')

  useEffect(() => {
    if (!isLoading && !isAuthenticated) navigate('/')
  }, [isAuthenticated, isLoading, navigate])

  if (isLoading || !user) return null

  return (
    <div className="container">
      <div className={layoutStyles.wrap}>
        <header className={layoutStyles.head}>
          <p className={sharedStyles.pageKicker} lang="en">
            /profile
          </p>
          {isSettings ? <h1 className={sharedStyles.pageTitle}>Настройки аккаунта</h1> : null}
          <nav className={layoutStyles.mainNav} aria-label="Разделы кабинета">
            <NavLink
              to="/profile"
              end
              className={({ isActive }) =>
                `${layoutStyles.mainNavLink} ${isActive ? layoutStyles.mainNavLinkActive : ''}`
              }
            >
              Профиль
            </NavLink>
            <NavLink
              to="/profile/settings"
              className={({ isActive }) =>
                `${layoutStyles.mainNavLink} ${isActive ? layoutStyles.mainNavLinkActive : ''}`
              }
            >
              Настройки аккаунта
            </NavLink>
          </nav>
        </header>
        <Outlet />
      </div>
    </div>
  )
}
