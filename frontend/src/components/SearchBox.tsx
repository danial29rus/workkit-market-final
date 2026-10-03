import {useEffect,useMemo,useRef,useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {ArrowRight,BriefcaseBusiness,Gift,Search,X} from 'lucide-react'
import {api} from '../api'
import type {Product} from '../types'
import {GIFT_CATEGORY,money} from '../lib/format'

const minPrice=(p:Product)=>Math.min(...p.variants.map(v=>Number(v.price)))

/** Instant search across both storefronts, grouped so it is obvious what is a service and what is a gift card. */
export default function SearchBox({autoFocus,onDone}:{autoFocus?:boolean;onDone?:()=>void}){
  const nav=useNavigate()
  const[q,setQ]=useState('')
  const[open,setOpen]=useState(false)
  const[products,setProducts]=useState<Product[]>([])
  const[active,setActive]=useState(-1)
  const box=useRef<HTMLFormElement>(null)
  useEffect(()=>{if(open&&!products.length)api.products().then(setProducts).catch(()=>{})},[open,products.length])
  useEffect(()=>{const h=(e:MouseEvent)=>{if(box.current&&!box.current.contains(e.target as Node))setOpen(false)};document.addEventListener('mousedown',h);return()=>document.removeEventListener('mousedown',h)},[])
  const term=q.trim().toLowerCase()
  const results=useMemo(()=>{
    if(!term)return[]
    return products.filter(p=>(p.title+' '+p.short_description+' '+p.category_name).toLowerCase().includes(term)).slice(0,8)
  },[products,term])
  const services=results.filter(p=>p.category_slug!==GIFT_CATEGORY)
  const gifts=results.filter(p=>p.category_slug===GIFT_CATEGORY)
  const ordered=[...services,...gifts]
  function go(path:string){setOpen(false);setQ('');setActive(-1);onDone?.();nav(path)}
  function submit(e:React.FormEvent){
    e.preventDefault()
    if(active>=0&&ordered[active])return go(`/product/${ordered[active].slug}`)
    if(!term)return
    // When every match is a gift card, the gift storefront is the more useful place to land.
    go(gifts.length&&!services.length?`/gift-cards?q=${encodeURIComponent(q.trim())}`:`/catalog?q=${encodeURIComponent(q.trim())}`)
  }
  function key(e:React.KeyboardEvent){
    if(e.key==='ArrowDown'){e.preventDefault();setActive(a=>Math.min(ordered.length-1,a+1))}
    if(e.key==='ArrowUp'){e.preventDefault();setActive(a=>Math.max(-1,a-1))}
    if(e.key==='Escape'){setOpen(false);(e.target as HTMLInputElement).blur()}
  }
  const row=(p:Product)=>{const i=ordered.indexOf(p);return <button type="button" key={p.id} className={`searchRow${i===active?' active':''}`} onMouseEnter={()=>setActive(i)} onClick={()=>go(`/product/${p.slug}`)}>
    <span className={`searchIcon ${p.category_slug===GIFT_CATEGORY?'gifts':'services'}`}>{p.category_slug===GIFT_CATEGORY?<Gift size={16}/>:<BriefcaseBusiness size={16}/>}</span>
    <span className="searchText"><b>{p.title}</b><small>{p.short_description}</small></span>
    <span className="searchPrice">от {money(minPrice(p))}</span>
  </button>}
  return <form ref={box} className={`searchBox${open&&term?' open':''}`} onSubmit={submit} role="search">
    <Search size={18} className="searchGlyph"/>
    <input autoFocus={autoFocus} value={q} onChange={e=>{setQ(e.target.value);setOpen(true);setActive(-1)}} onFocus={()=>setOpen(true)} onKeyDown={key} placeholder="Найти услугу или подарочную карту" aria-label="Поиск"/>
    {q&&<button type="button" className="searchClear" aria-label="Очистить" onClick={()=>{setQ('');setActive(-1)}}><X size={16}/></button>}
    {open&&term&&<div className="searchDrop">
      {!results.length&&<div className="searchNone">Ничего не нашли по «{q.trim()}». Попробуйте иначе сформулировать запрос.</div>}
      {services.length>0&&<div className="searchGroup"><span>Услуги для бизнеса</span>{services.map(row)}</div>}
      {gifts.length>0&&<div className="searchGroup"><span>Подарочные карты</span>{gifts.map(row)}</div>}
      {results.length>0&&<button className="searchAll" type="submit">Все результаты <ArrowRight size={15}/></button>}
    </div>}
  </form>
}
