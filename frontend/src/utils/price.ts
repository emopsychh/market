/** Сумма и знак валюты не разрываются переносом строки */
export function formatPriceRub(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (Number.isNaN(num)) return '—'
  return `${new Intl.NumberFormat('ru-RU').format(num)}\u00A0₽`
}

export function parsePriceNum(price: string | number | null | undefined): number | null {
  if (price === null || price === undefined || price === '') return null
  const num = typeof price === 'string' ? parseFloat(price) : price
  return Number.isNaN(num) ? null : num
}

/** Процент скидки от «было» к «стало», только для was > now */
export function formatDiscountPercent(was: number, now: number): string {
  if (was <= now) return ''
  const pct = Math.round((1 - now / was) * 100)
  return `-${pct}%`
}
