/** Сумма и знак валюты не разрываются переносом строки */
export function formatPriceRub(price: string | number): string {
  const num = typeof price === 'string' ? parseFloat(price) : price
  if (Number.isNaN(num)) return '—'
  return `${new Intl.NumberFormat('ru-RU').format(num)}\u00A0₽`
}
