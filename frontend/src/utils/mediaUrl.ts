/** Абсолютный URL для путей вида /media/... с бэкенда */
export function resolveMediaUrl(url: string): string {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  const path = url.startsWith('/') ? url : `/${url}`
  if (typeof window === 'undefined') return path
  return `${window.location.origin}${path}`
}
