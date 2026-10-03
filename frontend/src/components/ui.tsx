import {createContext,useCallback,useContext,useEffect,useRef,useState} from 'react'
import type {CSSProperties,ReactNode} from 'react'
import {Link} from 'react-router-dom'
import {BriefcaseBusiness,CheckCircle2,Gift,Minus,Plus,X} from 'lucide-react'
import {brandKey,statusLabel} from '../lib/format'

/* ---------- Toasts ---------- */
type Toast={id:number;title:string;text?:string;action?:{label:string;to:string};tone?:'success'|'error'}
const ToastContext=createContext<(t:Omit<Toast,'id'>)=>void>(()=>{})
export function ToastProvider({children}:{children:ReactNode}){
  const[items,setItems]=useState<Toast[]>([])
  const push=useCallback((t:Omit<Toast,'id'>)=>{
    const id=Date.now()+Math.random()
    setItems(list=>[...list.slice(-2),{...t,id}])
    setTimeout(()=>setItems(list=>list.filter(x=>x.id!==id)),4200)
  },[])
  return <ToastContext.Provider value={push}>{children}
    <div className="toasts" aria-live="polite">{items.map(t=><div key={t.id} className={`toast ${t.tone||'success'}`}>
      <CheckCircle2 size={20}/>
      <div className="toastBody"><b>{t.title}</b>{t.text&&<span>{t.text}</span>}</div>
      {t.action&&<Link className="toastAction" to={t.action.to}>{t.action.label}</Link>}
      <button className="toastClose" aria-label="Закрыть" onClick={()=>setItems(l=>l.filter(x=>x.id!==t.id))}><X size={16}/></button>
    </div>)}</div>
  </ToastContext.Provider>
}
export const useToast=()=>useContext(ToastContext)

/* ---------- Scroll reveal ---------- */
export function Reveal({children,className='',delay=0,as:Tag='div'}:{children:ReactNode;className?:string;delay?:number;as?:'div'|'section'|'article'}){
  const ref=useRef<HTMLDivElement>(null)
  const[shown,setShown]=useState(false)
  useEffect(()=>{
    const el=ref.current
    if(!el)return
    if(!('IntersectionObserver' in window)){setShown(true);return}
    const io=new IntersectionObserver(([e])=>{if(e.isIntersecting){setShown(true);io.disconnect()}},{rootMargin:'0px 0px -8% 0px'})
    io.observe(el)
    return()=>io.disconnect()
  },[])
  const T=Tag as any
  return <T ref={ref} className={`reveal${shown?' in':''} ${className}`} style={{'--d':`${delay}ms`} as CSSProperties}>{children}</T>
}

/* ---------- Small pieces ---------- */
export const Skeleton=({h=16,w='100%',r=10,className=''}:{h?:number|string;w?:number|string;r?:number;className?:string})=>
  <span className={`skeleton ${className}`} style={{height:h,width:w,borderRadius:r}}/>

export function QtyStepper({value,onChange,min=1,max=20,size='md'}:{value:number;onChange:(v:number)=>void;min?:number;max?:number;size?:'sm'|'md'}){
  return <div className={`qty ${size}`}>
    <button type="button" aria-label="Уменьшить" disabled={value<=min} onClick={()=>onChange(Math.max(min,value-1))}><Minus size={16}/></button>
    <b key={value} className="qtyValue">{value}</b>
    <button type="button" aria-label="Увеличить" disabled={value>=max} onClick={()=>onChange(Math.min(max,value+1))}><Plus size={16}/></button>
  </div>
}

export const StatusBadge=({status}:{status:string})=><span className={`status s-${status}`}><i/>{statusLabel[status]||status}</span>

export function EmptyState({icon,title,text,children}:{icon:ReactNode;title:string;text?:string;children?:ReactNode}){
  return <div className="emptyState"><div className="emptyIcon">{icon}</div><h3>{title}</h3>{text&&<p>{text}</p>}{children&&<div className="emptyActions">{children}</div>}</div>
}

/** Pill that tells which storefront the user is in — services vs. gift cards. */
export function Direction({kind,small}:{kind:'services'|'gifts';small?:boolean}){
  return kind==='gifts'
    ?<span className={`direction gifts${small?' sm':''}`}><Gift size={small?13:15}/>Подарочные карты</span>
    :<span className={`direction services${small?' sm':''}`}><BriefcaseBusiness size={small?13:15}/>Услуги для бизнеса</span>
}

/** Card-shaped brand visual used across the gift card storefront. */
export function GiftArt({title,size='md',caption}:{title:string;size?:'sm'|'md'|'lg';caption?:string}){
  return <div className={`giftArt b-${brandKey(title)} ${size}`} aria-hidden="true">
    <span className="giftArtShine"/>
    <span className="giftArtChip"/>
    <span className="giftArtLabel">{caption||'GIFT CARD'}</span>
    <span className="giftArtName">{title}</span>
  </div>
}

export function PageHead({crumbs,title,text,aside}:{crumbs:{label:string;to?:string}[];title:ReactNode;text?:ReactNode;aside?:ReactNode}){
  return <div className="pageHead">
    <div>
      <nav className="crumbs" aria-label="Навигация">{crumbs.map((c,i)=><span key={i}>{c.to?<Link to={c.to}>{c.label}</Link>:c.label}</span>)}</nav>
      <h1>{title}</h1>
      {text&&<p>{text}</p>}
    </div>
    {aside}
  </div>
}
