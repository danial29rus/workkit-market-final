import type {AdminSummary,AuthResponse,Order,Product,SiteConfig,User} from './types'
const API=import.meta.env.VITE_API_URL||'/api'
const token=()=>localStorage.getItem('workkit_token')
const adminToken=()=>localStorage.getItem('workkit_admin_token')||''
async function request<T>(path:string, init?:RequestInit):Promise<T>{
  const auth=token()
  const r=await fetch(API+path,{...init,headers:{'Content-Type':'application/json',...(auth?{Authorization:`Bearer ${auth}`}:{ }),...(init?.headers||{})}})
  if(!r.ok){let detail:any={};try{detail=await r.json()}catch{};throw new Error(detail?.detail?.message||detail?.detail||`HTTP ${r.status}`)}
  if(r.status===204)return undefined as T
  return r.json()
}
async function adminRequest<T>(path:string,init?:RequestInit):Promise<T>{
  return request<T>(path,{...init,headers:{'X-Admin-Token':adminToken(),...(init?.headers||{})}})
}
function saveSession(data:AuthResponse){localStorage.setItem('workkit_token',data.access_token);localStorage.setItem('workkit_user',JSON.stringify(data.user));window.dispatchEvent(new Event('workkit-session'))}
export const session={
  token,
  user:():User|null=>{try{return JSON.parse(localStorage.getItem('workkit_user')||'null')}catch{return null}},
  save:saveSession,
  logout:()=>{localStorage.removeItem('workkit_token');localStorage.removeItem('workkit_user');window.dispatchEvent(new Event('workkit-session'))}
}
export const adminSession={token:adminToken,save:(value:string)=>localStorage.setItem('workkit_admin_token',value),logout:()=>localStorage.removeItem('workkit_admin_token')}
export const api={
  siteConfig:()=>request<SiteConfig>('/site/config'),
  products:()=>request<Product[]>('/catalog/products'),
  product:(slug:string)=>request<Product>(`/catalog/products/${slug}`),
  register:(payload:{full_name:string;email:string;password:string;phone?:string})=>request<AuthResponse>('/auth/register',{method:'POST',body:JSON.stringify(payload)}),
  login:(email:string,password:string)=>request<AuthResponse>('/auth/login',{method:'POST',body:JSON.stringify({email,password})}),
  me:()=>request<User>('/auth/me'),
  createOrder:(variant_id:number)=>request<Order>('/orders',{method:'POST',body:JSON.stringify({variant_id,quantity:1})}),
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
    siteConfig:()=>adminRequest<SiteConfig>('/admin/site-config'),
    updateSiteConfig:(payload:SiteConfig)=>adminRequest<SiteConfig>('/admin/site-config',{method:'PUT',body:JSON.stringify(payload)}),
  }
}
