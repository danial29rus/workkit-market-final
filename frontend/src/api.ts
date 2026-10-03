import type {AdminSummary,AuthResponse,BonusTransaction,Order,OrderQuote,Product,PromoCode,SiteConfig,User} from './types'
import {ApiError} from './lib/errors'
const API=import.meta.env.VITE_API_URL||'/api'
const token=()=>localStorage.getItem('workkit_token')
const adminToken=()=>localStorage.getItem('workkit_admin_token')||''
async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const auth=token()
  let r:Response
  try{r=await fetch(API+path,{...init,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{ }),...(init?.headers||{})}})}
  catch{throw new ApiError('network_error',0)}
  if(!r.ok){
    let detail:any={};try{detail=await r.json()}catch{}
    const raw=detail?.detail
    const code=typeof raw==='string'?raw:raw?.code||''
    // A rejected customer token means the stored session is stale — drop it everywhere.
    if(r.status===401&&auth&&['invalid_token','user_not_found'].includes(code))session.logout()
    throw new ApiError(code,r.status,typeof raw==='object'&&!Array.isArray(raw)?raw?.message:undefined)
  }
  if(r.status===204)return undefined as T
  return r.json()
}
async function adminRequest<T>(path:string,init?:RequestInit):Promise<T>{
  return request<T>(path,{...init,headers:{'X-Admin-Token':adminToken(),...(init?.headers||{})}})
}
function saveSession(data:AuthResponse){localStorage.setItem('workkit_token',data.access_token);saveUser(data.user)}
function saveUser(user:User){localStorage.setItem('workkit_user',JSON.stringify(user));window.dispatchEvent(new Event('workkit-session'))}
export const session={
  token,
  user:():User|null=>{if(!token())return null;try{return JSON.parse(localStorage.getItem('workkit_user')||'null')}catch{return null}},
  save:saveSession,
  saveUser,
  logout:()=>{localStorage.removeItem('workkit_token');localStorage.removeItem('workkit_user');window.dispatchEvent(new Event('workkit-session'))}
}
export const adminSession={token:adminToken,save:(value:string)=>localStorage.setItem('workkit_admin_token',value),logout:()=>localStorage.removeItem('workkit_admin_token')}

// The catalog is shared by most pages: fetch it once and reuse it for a short while.
let productsCache:{at:number;promise:Promise<Product[]>}|null=null
function cachedProducts(){
  if(!productsCache||Date.now()-productsCache.at>60_000){
    const promise=request<Product[]>('/catalog/products')
    productsCache={at:Date.now(),promise}
    promise.catch(()=>{productsCache=null})
  }
  return productsCache.promise
}

type Lines={variant_id:number;quantity:number}[]
export const api={
  siteConfig:()=>request<SiteConfig>('/site/config'),
  products:cachedProducts,
  product:(slug:string)=>request<Product>(`/catalog/products/${slug}`),
  register:(payload:{full_name:string;email:string;password:string;phone?:string})=>request<AuthResponse>('/auth/register',{method:'POST',body:JSON.stringify(payload)}),
  login:(email:string,password:string)=>request<AuthResponse>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
  me:()=>request<User>('/auth/me'),
  updateMe:(payload:{full_name:string;phone:string|null})=>request<User>('/auth/me',{method:'PATCH',body:JSON.stringify(payload)}),
  changePassword:(current_password:string,new_password:string)=>request<void>('/auth/password',{method:'POST',body:JSON.stringify({current_password,new_password})}),
  bonusHistory:()=>request<BonusTransaction[]>('/auth/bonus-history'),
  createOrder:(variant_id:number,quantity=1,promo_code?:string,bonus_amount=0)=>request<Order>('/orders',{method:'POST',body:JSON.stringify({variant_id,quantity,promo_code:promo_code||null,bonus_amount})}),
  quoteOrder:(variant_id:number,quantity=1,promo_code?:string,bonus_amount=0)=>request<OrderQuote>('/orders/quote',{method:'POST',body:JSON.stringify({variant_id,quantity,promo_code:promo_code||null,bonus_amount})}),
  createGiftCart:(items:Lines,promo_code?:string,bonus_amount=0)=>request<Order>('/orders/gift-cart',{method:'POST',body:JSON.stringify({items,promo_code:promo_code||null,bonus_amount})}),
  quoteGiftCart:(items:Lines,promo_code?:string,bonus_amount=0)=>request<OrderQuote>('/orders/gift-cart/quote',{method:'POST',body:JSON.stringify({items,promo_code:promo_code||null,bonus_amount})}),
  order:(id:string)=>request<Order>(`/orders/${id}`),
  orders:()=>request<Order[]>('/orders'),
  createPayment:()=>request('/payments/create',{method:'POST'}),
  admin:{
    summary:()=>adminRequest<AdminSummary>('/admin/summary'),
    orders:()=>adminRequest<Order[]>('/admin/orders'),
    updateOrder:(id:string,status:string)=>adminRequest<Order>(`/admin/orders/${id}`,{method:'PATCH',body:JSON.stringify({status})}),
    products:()=>adminRequest<Product[]>('/admin/products'),
    createProduct:(payload:Record<string,unknown>)=>adminRequest<{id:number;slug:string}>('/admin/products',{method:'POST',body:JSON.stringify(payload)}),
    updateProduct:(id:number,payload:Record<string,unknown>)=>adminRequest<Product>(`/admin/products/${id}`,{method:'PATCH',body:JSON.stringify(payload)}),
    addVariant:(id:number,payload:Record<string,unknown>)=>adminRequest(`/admin/products/${id}/variants`,{method:'POST',body:JSON.stringify(payload)}),
    updateVariant:(id:number,payload:Record<string,unknown>)=>adminRequest(`/admin/variants/${id}`,{method:'PATCH',body:JSON.stringify(payload)}),
    promotions:()=>adminRequest<PromoCode[]>('/admin/promotions'),
    createPromotion:(payload:Record<string,unknown>)=>adminRequest<PromoCode>('/admin/promotions',{method:'POST',body:JSON.stringify(payload)}),
    updatePromotion:(id:number,payload:Record<string,unknown>)=>adminRequest<PromoCode>(`/admin/promotions/${id}`,{method:'PATCH',body:JSON.stringify(payload)}),
    siteConfig:()=>adminRequest<SiteConfig>('/admin/site-config'),
    updateSiteConfig:(payload:SiteConfig)=>adminRequest<SiteConfig>('/admin/site-config',{method:'PUT',body:JSON.stringify(payload)}),
  }
}
