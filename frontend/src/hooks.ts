import {useCallback,useEffect,useState} from 'react'
import {api,session} from './api'
import {giftCart} from './giftCart'
import type {Product,User} from './types'

let meRequest:Promise<User>|null=null
/** Current customer; refreshes the profile (bonus balance etc.) once per page load. */
export function useUser(){
  const[user,setUser]=useState<User|null>(session.user())
  useEffect(()=>{
    const h=()=>setUser(session.user())
    window.addEventListener('workkit-session',h)
    if(session.token()&&!meRequest){
      meRequest=api.me()
      meRequest.then(session.saveUser).catch(()=>{}).finally(()=>{setTimeout(()=>{meRequest=null},30_000)})
    }
    return()=>window.removeEventListener('workkit-session',h)
  },[])
  const refresh=useCallback(()=>api.me().then(u=>{session.saveUser(u);return u}),[])
  return{user,refresh}
}

export function useGiftCart(){
  const[lines,setLines]=useState(giftCart.items())
  useEffect(()=>{
    const h=()=>setLines(giftCart.items())
    window.addEventListener('workkit-gift-cart',h)
    window.addEventListener('storage',h)
    return()=>{window.removeEventListener('workkit-gift-cart',h);window.removeEventListener('storage',h)}
  },[])
  return{lines,count:lines.reduce((s,l)=>s+l.quantity,0)}
}

export function useProducts(){
  const[products,setProducts]=useState<Product[]>([])
  const[loading,setLoading]=useState(true)
  const[error,setError]=useState('')
  const load=useCallback(()=>{
    setLoading(true);setError('')
    api.products().then(setProducts).catch(e=>setError(e.message)).finally(()=>setLoading(false))
  },[])
  useEffect(load,[load])
  return{products,loading,error,reload:load}
}

export function useDebounced<T>(value:T,ms=350){
  const[v,setV]=useState(value)
  useEffect(()=>{const t=setTimeout(()=>setV(value),ms);return()=>clearTimeout(t)},[value,ms])
  return v
}

export function useDocumentTitle(title:string){
  useEffect(()=>{document.title=title?`${title} — WorkKit`:'WorkKit'},[title])
}

/* Which storefront a product/checkout page belongs to, so the header can highlight it. */
let currentArea:'services'|'gifts'|null=null
export function setArea(area:'services'|'gifts'|null){if(area!==currentArea){currentArea=area;window.dispatchEvent(new Event('workkit-area'))}}
export function useArea(){
  const[area,setA]=useState(currentArea)
  useEffect(()=>{const h=()=>setA(currentArea);window.addEventListener('workkit-area',h);return()=>window.removeEventListener('workkit-area',h)},[])
  return area
}
