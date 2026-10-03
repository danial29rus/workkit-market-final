// Backend error codes → human-readable Russian messages.
const MESSAGES: Record<string, string> = {
  authentication_required: 'Войдите в аккаунт, чтобы продолжить.',
  invalid_token: 'Сессия истекла. Войдите снова.',
  user_not_found: 'Сессия истекла. Войдите снова.',
  invalid_email_or_password: 'Неверный e-mail или пароль.',
  email_already_registered: 'Этот e-mail уже зарегистрирован. Попробуйте войти.',
  invalid_current_password: 'Текущий пароль указан неверно.',
  variant_not_found: 'Позиция больше недоступна. Обновите страницу.',
  product_not_found: 'Товар не найден или снят с продажи.',
  only_gift_cards_allowed: 'В корзину можно добавить только подарочные карты.',
  out_of_stock: 'Недостаточно кодов в наличии. Уменьшите количество.',
  promo_not_available: 'Промокод не найден или уже не действует.',
  promo_limit_reached: 'Лимит использования промокода исчерпан.',
  promo_already_used: 'Вы уже использовали этот промокод.',
  promo_minimum_not_reached: 'Сумма заказа меньше минимальной для этого промокода.',
  bonus_balance_exceeded: 'Недостаточно бонусов на балансе.',
  order_not_found: 'Заказ не найден.',
  invalid_admin_token: 'Неверный токен администратора.',
}

export class ApiError extends Error {
  code: string
  status: number
  constructor(code: string, status: number, message?: string) {
    super(message || MESSAGES[code] || humanize(code, status))
    this.code = code
    this.status = status
  }
}

function humanize(code: string, status: number) {
  if (status === 0) return 'Нет соединения с сервером. Проверьте интернет.'
  if (status === 422) return 'Проверьте правильность заполнения полей.'
  if (status >= 500) return 'Сервис временно недоступен. Попробуйте чуть позже.'
  return code && !/^[a-z_]+$/.test(code) ? code : 'Что-то пошло не так. Попробуйте ещё раз.'
}

export const errorText = (e: unknown, fallback = 'Что-то пошло не так. Попробуйте ещё раз.') =>
  e instanceof Error && e.message ? e.message : fallback
