from collections import Counter
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from .models import BonusTransaction, Customer, Order, OrderItem, ProductVariant, PromoCode

MONEY = Decimal('0.01')
BONUS_RATE = Decimal('0.02')


def currency(value: Decimal) -> Decimal:
    return Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)


class OrderService:
    @staticmethod
    def _quote_lines(db: Session, customer: Customer, lines: list[tuple[int, int]], promo_code: str | None, bonus_amount: Decimal, gift_only: bool = False) -> dict:
        quantities = Counter()
        for variant_id, quantity in lines:
            quantities[variant_id] += quantity
        variants = list(db.scalars(select(ProductVariant).options(selectinload(ProductVariant.product)).where(ProductVariant.id.in_(quantities))).all())
        by_id = {variant.id: variant for variant in variants}
        if len(by_id) != len(quantities):
            raise ValueError('variant_not_found')
        if gift_only and any(variant.delivery_type != 'gift_card' for variant in variants):
            raise ValueError('only_gift_cards_allowed')
        for variant_id, quantity in quantities.items():
            variant = by_id[variant_id]
            if variant.stock_quantity is not None and quantity > variant.stock_quantity:
                raise ValueError('out_of_stock')
        subtotal = currency(sum((Decimal(by_id[variant_id].price) * quantity for variant_id, quantity in quantities.items()), start=Decimal('0.00')))
        code = promo_code.strip().upper() if promo_code else None
        discount = Decimal('0.00')
        if code:
            promo = db.scalar(select(PromoCode).where(PromoCode.code == code))
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            invalid = not promo or not promo.active or (promo.starts_at and promo.starts_at > now) or (promo.ends_at and promo.ends_at < now)
            if invalid: raise ValueError('promo_not_available')
            if promo.usage_limit is not None and promo.usage_count >= promo.usage_limit: raise ValueError('promo_limit_reached')
            already_used = db.scalar(select(Order.id).where(Order.customer_id == customer.id, Order.promo_code == code, Order.status.not_in({'cancelled', 'refunded'})))
            if already_used: raise ValueError('promo_already_used')
            if subtotal < Decimal(promo.min_order_amount): raise ValueError('promo_minimum_not_reached')
            discount = subtotal * Decimal(promo.discount_value) / Decimal('100') if promo.discount_type == 'percent' else Decimal(promo.discount_value)
            if promo.max_discount_amount is not None: discount = min(discount, Decimal(promo.max_discount_amount))
            discount = min(currency(discount), subtotal)
        requested_bonus = currency(Decimal(bonus_amount))
        if requested_bonus > Decimal(customer.bonus_balance): raise ValueError('bonus_balance_exceeded')
        bonus_spent = min(requested_bonus, max(Decimal('0.00'), subtotal - discount))
        total = currency(subtotal - discount - bonus_spent)
        return {'variants': by_id, 'quantities': quantities, 'subtotal_amount': subtotal, 'promo_code': code, 'promo_discount_amount': discount, 'bonus_spent_amount': bonus_spent, 'total_amount': total, 'bonus_earned_amount': currency(total * BONUS_RATE)}

    @staticmethod
    def quote(db: Session, customer: Customer, variant_id: int, quantity: int = 1, promo_code: str | None = None, bonus_amount: Decimal = Decimal('0.00')) -> dict:
        return OrderService._quote_lines(db, customer, [(variant_id, quantity)], promo_code, bonus_amount)

    @staticmethod
    def quote_gift_cart(db: Session, customer: Customer, lines: list[tuple[int, int]], promo_code: str | None = None, bonus_amount: Decimal = Decimal('0.00')) -> dict:
        return OrderService._quote_lines(db, customer, lines, promo_code, bonus_amount, gift_only=True)

    @staticmethod
    def _create_from_quote(db: Session, customer: Customer, quote: dict) -> Order:
        order = Order(public_id='WK-' + secrets.token_hex(4).upper(), customer_id=customer.id, status='awaiting_payment', total_amount=quote['total_amount'], subtotal_amount=quote['subtotal_amount'], promo_code=quote['promo_code'], promo_discount_amount=quote['promo_discount_amount'], bonus_spent_amount=quote['bonus_spent_amount'], bonus_earned_amount=quote['bonus_earned_amount'], currency='RUB')
        db.add(order); db.flush()
        if quote['promo_code']: db.scalar(select(PromoCode).where(PromoCode.code == quote['promo_code'])).usage_count += 1
        for variant_id, quantity in quote['quantities'].items():
            variant = quote['variants'][variant_id]
            if variant.stock_quantity is not None: variant.stock_quantity -= quantity
            db.add(OrderItem(order_id=order.id, variant_id=variant.id, title_snapshot=variant.product.title, variant_snapshot=variant.name, unit_price=variant.price, quantity=quantity))
        if quote['bonus_spent_amount']:
            customer.bonus_balance = currency(Decimal(customer.bonus_balance) - quote['bonus_spent_amount'])
            db.add(BonusTransaction(customer_id=customer.id, order_id=order.id, amount=-quote['bonus_spent_amount'], kind='spent', description=f'Списано в заказе {order.public_id}'))
        db.commit(); db.refresh(order)
        return order

    @staticmethod
    def create(db: Session, customer: Customer, variant_id: int, quantity: int = 1, promo_code: str | None = None, bonus_amount: Decimal = Decimal('0.00')) -> Order:
        return OrderService._create_from_quote(db, customer, OrderService.quote(db, customer, variant_id, quantity, promo_code, bonus_amount))

    @staticmethod
    def create_gift_cart(db: Session, customer: Customer, lines: list[tuple[int, int]], promo_code: str | None = None, bonus_amount: Decimal = Decimal('0.00')) -> Order:
        return OrderService._create_from_quote(db, customer, OrderService.quote_gift_cart(db, customer, lines, promo_code, bonus_amount))

    @staticmethod
    def set_status(db: Session, order: Order, status: str) -> Order:
        allowed = {'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded'}
        if status not in allowed: raise ValueError('invalid_status')
        was_paid = order.status in {'paid', 'in_progress', 'completed'}; will_be_paid = status in {'paid', 'in_progress', 'completed'}
        if not was_paid and will_be_paid and order.bonus_earned_amount:
            order.customer.bonus_balance = currency(Decimal(order.customer.bonus_balance) + Decimal(order.bonus_earned_amount))
            db.add(BonusTransaction(customer_id=order.customer_id, order_id=order.id, amount=order.bonus_earned_amount, kind='earned', description=f'Начислено за заказ {order.public_id}'))
        is_cancellation = status in {'cancelled', 'refunded'} and order.status not in {'cancelled', 'refunded'}
        if is_cancellation and order.bonus_spent_amount:
            spent = db.scalar(select(BonusTransaction).where(BonusTransaction.order_id == order.id, BonusTransaction.kind == 'spent'))
            if spent:
                order.customer.bonus_balance = currency(Decimal(order.customer.bonus_balance) + Decimal(order.bonus_spent_amount)); db.add(BonusTransaction(customer_id=order.customer_id, order_id=order.id, amount=order.bonus_spent_amount, kind='returned', description=f'Возврат бонусов по заказу {order.public_id}')); db.delete(spent)
        if is_cancellation and was_paid and order.bonus_earned_amount:
            earned = db.scalar(select(BonusTransaction).where(BonusTransaction.order_id == order.id, BonusTransaction.kind == 'earned'))
            if earned: order.customer.bonus_balance = currency(Decimal(order.customer.bonus_balance) - Decimal(order.bonus_earned_amount)); db.delete(earned)
        if is_cancellation and order.promo_code:
            promo = db.scalar(select(PromoCode).where(PromoCode.code == order.promo_code))
            if promo and promo.usage_count: promo.usage_count -= 1
        if is_cancellation:
            for item in order.items:
                variant = db.get(ProductVariant, item.variant_id)
                if variant and variant.stock_quantity is not None: variant.stock_quantity += item.quantity
        order.status = status
        if status in {'paid', 'in_progress', 'completed'} and not order.delivery_token: order.delivery_token = 'REQ-' + '-'.join([secrets.token_hex(2).upper() for _ in range(3)])
        db.commit(); db.refresh(order)
        return order
