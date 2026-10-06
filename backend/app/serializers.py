def product_to_dict(p, admin: bool = False):
    return {
        'id': p.id, 'slug': p.slug, 'title': p.title,
        'short_description': p.short_description, 'description': p.description,
        'image_url': p.image_url, 'active': p.active,
        'category_name': p.category.name, 'category_slug': p.category.slug,
        'variants': [_variant_dict(v, admin) for v in p.variants],
    }


_PUBLIC_VARIANT = ('id', 'name', 'sku', 'price', 'old_price', 'delivery_type', 'face_value', 'commission_percent', 'stock_quantity', 'face_currency', 'exchange_rate')


def _variant_dict(v, admin: bool):
    fields = _PUBLIC_VARIANT + (('supplier_category_id', 'supplier_card_id') if admin else ())
    return {f: getattr(v, f) for f in fields}


def _item_dict(i, admin: bool):
    from .fulfilment import codes_of
    status = i.fulfil_status
    data = {
        'id': i.id, 'title': i.title_snapshot, 'variant': i.variant_snapshot, 'unit_price': i.unit_price, 'quantity': i.quantity,
        'delivery_type': i.variant.delivery_type if i.variant else 'service',
        'product_slug': i.variant.product.slug if i.variant else None,
        # Customers only see a simple state; supplier details stay in the admin.
        'fulfil_status': status if admin else ({'delivered': 'delivered', None: None}.get(status, 'in_progress') if status else None),
        'codes': codes_of(i) if status == 'delivered' else [],
    }
    if admin:
        data.update({'supplier': i.supplier, 'supplier_order_number': i.supplier_order_number, 'supplier_error': i.supplier_error})
    return data


def order_to_dict(o, admin: bool = False):
    return {
        'public_id': o.public_id, 'status': o.status, 'currency': o.currency,
        'total_amount': o.total_amount, 'delivery_token': o.delivery_token,
        'subtotal_amount': o.subtotal_amount, 'promo_code': o.promo_code,
        'promo_discount_amount': o.promo_discount_amount, 'bonus_spent_amount': o.bonus_spent_amount,
        'bonus_earned_amount': o.bonus_earned_amount,
        'created_at': o.created_at, 'customer_email': o.customer.email,
        'customer_name': o.customer.full_name,
        'items': [_item_dict(i, admin) for i in o.items],
    }
