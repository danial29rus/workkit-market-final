const rub2 = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const rub0 = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 })

/** Rubles with kopecks only when they are non-zero: 1 100 ₽, 112,50 ₽. */
export const money = (v: string | number | null | undefined) => {
  const n = Number(v || 0)
  return Math.round(n * 100) % 100 === 0 ? rub0.format(n) : rub2.format(n)
}

export const plural = (n: number, forms: [string, string, string]) => {
  const a = Math.abs(n) % 100, b = a % 10
  if (a > 10 && a < 20) return forms[2]
  if (b > 1 && b < 5) return forms[1]
  if (b === 1) return forms[0]
  return forms[2]
}

export const dateTime = (v: string) =>
  new Date(v).toLocaleString('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })

export const dateShort = (v: string) =>
  new Date(v).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })

export const GIFT_CATEGORY = 'gift-cards'

export const brandKey = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '')

export const statusLabel: Record<string, string> = {
  awaiting_payment: 'Ожидает оплаты',
  paid: 'Оплачен',
  in_progress: 'В работе',
  completed: 'Выполнен',
  cancelled: 'Отменён',
  refunded: 'Возврат',
}
