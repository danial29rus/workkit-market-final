from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import secrets
from sqlalchemy import select
from sqlalchemy.orm import Session
from .models import BonusTransaction, Customer, Order, OrderItem, ProductVariant, PromoCode

MONEY = Decimal('0.01')
BONUS_RATE = Decimal('0.02')


def currency(value: Decimal) -> Decimal:
    return Decimal(value).quantize(MONEY, rounding=ROUND_HALF_UP)

class OrderService:
    @staticmethod
    def quote(db: Session, customer: Customer, variant_id: int, quantity: int = 1, promo_code: str | None = None, bonus_amount: Decimal = Decimal('0.00')) -> dict:
        variant = db.scalar(select(ProductVariant).where(ProductVariant.id == variant_id))
        if not variant:
            raise ValueError('variant_not_found')
        subtotal = currency(Decimal(variant.price) * quantity)
        code = promo_code.strip().upper() if promo_code else None
        discount = Decimal('0.00')
        if code:
            promo = db.scalar(select(PromoCode).where(PromoCode.code == code))
            now = datetime.now(timezone.utc).replace(tzinfo=None)
            invalid = not promo or not promo.active or (promo.starts_at and promo.starts_at > now) or (promo.ends_at and promo.ends_at < now)
            if invalid:
                raise ValueError('promo_not_available')
            if promo.usage_limit is not None and promo.usage_count >= promo.usage_limit:
                raise ValueError('promo_limit_reached')
            already_used = db.scalar(select(Order.id).where(
                Order.customer_id == customer.id,
                Order.promo_code == code,
                Order.status.not_in({'cancelled', 'refunded'}),
            ))
            if already_used:
                raise ValueError('promo_already_used')
            if subtotal < Decimal(promo.min_order_amount):
                raise ValueError('promo_minimum_not_reached')
            if promo.discount_type == 'percent':
                discount = subtotal * Decimal(promo.discount_value) / Decimal('100')
            else:
                discount = Decimal(promo.discount_value)
            if promo.max_discount_amount is not None:
                discount = min(discount, Decimal(promo.max_discount_amount))
            discount = min(currency(discount), subtotal)
        allowed_bonus = max(Decimal('0.00'), subtotal - discount)
        requested_bonus = currency(Decimal(bonus_amount))
        if requested_bonus > Decimal(customer.bonus_balance):
            raise ValueError('bonus_balance_exceeded')
        if variant.stock_quantity is not None and quantity > variant.stock_quantity:
            raise ValueError('out_of_stock')
        bonus_spent = min(requested_bonus, allowed_bonus)
        total = currency(subtotal - discount - bonus_spent)
        return {
            'variant': variant, 'subtotal_amount': subtotal, 'promo_code': code,
            'promo_discount_amount': discount, 'bonus_spent_amount': bonus_spent,
            'total_amount': total, 'bonus_earned_amount': currency(total * BONUS_RATE),
        }

    @staticmethod
    def create(db: Session, customer: Customer, variant_id: int, quantity: int = 1, promo_code: str | None = None, bonus_amount: Decimal = Decimal('0.00')) -> Order:
        quote = OrderService.quote(db, customer, variant_id, quantity, promo_code, bonus_amount)
        variant = quote['variant']
        order = Order(
            public_id='WK-' + secrets.token_hex(4).upper(),
            customer_id=customer.id,
            status='awaiting_payment',
            total_amount=quote['total_amount'],
            subtotal_amount=quote['subtotal_amount'],
            promo_code=quote['promo_code'],
            promo_discount_amount=quote['promo_discount_amount'],
            bonus_spent_amount=quote['bonus_spent_amount'],
            bonus_earned_amount=quote['bonus_earned_amount'],
            currency='RUB',
        )
        db.add(order)
        db.flush()
        if quote['promo_code']:
            promo = db.scalar(select(PromoCode).where(PromoCode.code == quote['promo_code']))
            promo.usage_count += 1
        if variant.stock_quantity is not None:
            variant.stock_quantity -= quantity
        if quote['bonus_spent_amount']:
            customer.bonus_balance = currency(Decimal(customer.bonus_balance) - quote['bonus_spent_amount'])
            db.add(BonusTransaction(
                customer_id=customer.id, order_id=order.id, amount=-quote['bonus_spent_amount'],
                kind='spent', description=f'Списано в заказе {order.public_id}',
            ))
        db.add(OrderItem(
            order_id=order.id,
            variant_id=variant.id,
            title_snapshot=variant.product.title,
            variant_snapshot=variant.name,
            unit_price=variant.price,
            quantity=quantity,
        ))
        db.commit()
        db.refresh(order)
        return order

    @staticmethod
    def set_status(db: Session, order: Order, status: str) -> Order:
        allowed = {'awaiting_payment', 'paid', 'in_progress', 'completed', 'cancelled', 'refunded'}
        if status not in allowed:
            raise ValueError('invalid_status')
        was_paid = order.status in {'paid', 'in_progress', 'completed'}
        will_be_paid = status in {'paid', 'in_progress', 'completed'}
        if not was_paid and will_be_paid and order.bonus_earned_amount:
            order.customer.bonus_balance = currency(Decimal(order.customer.bonus_balance) + Decimal(order.bonus_earned_amount))
            db.add(BonusTransaction(
                customer_id=order.customer_id, order_id=order.id, amount=order.bonus_earned_amount,
                kind='earned', description=f'Начислено за заказ {order.public_id}',
            ))
        is_cancellation = status in {'cancelled', 'refunded'} and order.status not in {'cancelled', 'refunded'}
        if is_cancellation and order.bonus_spent_amount:
            spent = db.scalar(select(BonusTransaction).where(BonusTransaction.order_id == order.id, BonusTransaction.kind == 'spent'))
            if spent:
                order.customer.bonus_balance = currency(Decimal(order.customer.bonus_balance) + Decimal(order.bonus_spent_amount))
                db.add(BonusTransaction(
                    customer_id=order.customer_id, order_id=order.id, amount=order.bonus_spent_amount,
                    kind='returned', description=f'Возврат бонусов по заказу {order.public_id}',
                ))
                db.delete(spent)
        if is_cancellation and was_paid and order.bonus_earned_amount:
            earned = db.scalar(select(BonusTransaction).where(BonusTransaction.order_id == order.id, BonusTransaction.kind == 'earned'))
            if earned:
                order.customer.bonus_balance = currency(Decimal(order.customer.bonus_balance) - Decimal(order.bonus_earned_amount))
                db.delete(earned)
        if is_cancellation and order.promo_code:
            promo = db.scalar(select(PromoCode).where(PromoCode.code == order.promo_code))
            if promo and promo.usage_count:
                promo.usage_count -= 1
        if is_cancellation:
            variant = db.get(ProductVariant, order.items[0].variant_id) if order.items else None
            if variant and variant.stock_quantity is not None:
                variant.stock_quantity += order.items[0].quantity
        order.status = status
        if status in {'paid', 'in_progress', 'completed'} and not order.delivery_token:
            order.delivery_token = 'REQ-' + '-'.join([secrets.token_hex(2).upper() for _ in range(3)])
        db.commit()
        db.refresh(order)
        return order
