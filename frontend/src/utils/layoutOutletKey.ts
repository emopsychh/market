/**
 * Ключ для remount Outlet в Layout: одна «ветка» профиля без лишнего remount
 * при переключении /profile ↔ /profile/settings.
 */
export function layoutOutletKey(pathname: string): string {
  if (pathname === '/profile' || pathname.startsWith('/profile/')) {
    return '__profile__'
  }
  return pathname
}
