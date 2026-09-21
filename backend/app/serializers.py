def product_to_dict(p):
    return {
        'id': p.id, 'slug': p.slug, 'title': p.title,
        'short_description': p.short_description, 'description': p.description,
        'image_url': p.image_url, 'active': p.active,
        'category_name': p.category.name, 'category_slug': p.category.slug,
        'variants': p.variants,
    }


def order_to_dict(o):
    return {
        'public_id': o.public_id, 'status': o.status, 'currency': o.currency,
        'total_amount': o.total_amount, 'delivery_token': o.delivery_token,
        'created_at': o.created_at, 'customer_email': o.customer.email,
        'customer_name': o.customer.full_name,
        'items': [
            {'title': i.title_snapshot, 'variant': i.variant_snapshot, 'unit_price': i.unit_price, 'quantity': i.quantity}
            for i in o.items
        ]
    }
