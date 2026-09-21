export type Variant={id:number;name:string;sku:string;price:string;old_price:string|null;delivery_type:string}
export type Product={id:number;slug:string;title:string;short_description:string;description:string;image_url:string;active:boolean;category_name:string;category_slug:string;variants:Variant[]}
export type OrderItem={title:string;variant:string;unit_price:string;quantity:number}
export type Order={public_id:string;status:string;currency:string;total_amount:string;delivery_token:string|null;created_at:string;customer_email:string;customer_name:string|null;items:OrderItem[]}
export type User={id:number;email:string;full_name:string|null;phone:string|null;created_at:string}
export type AuthResponse={access_token:string;token_type:string;user:User}
export type SiteConfig={brand_name:string;brand_short:string;brand_mark:string;site_mode:string;accent_color:string;tagline:string;hero_eyebrow:string;hero_title:string;hero_text:string;hero_cta:string;catalog_label:string;item_label:string;order_cta:string;promo_title:string;promo_text:string;support_email:string;support_phone:string;work_hours:string;seller_name:string;seller_inn:string;seller_ogrn:string;seller_address:string}
export type AdminSummary={orders_total:number;orders_open:number;revenue_paid:string;products_total:number;products_active:number}
