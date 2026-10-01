import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {Gift,Search,ShieldCheck,Zap} from 'lucide-react'
import {api} from '../api'
import type {Product} from '../types'

const money=(v:string)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB'}).format(Number(v))
const brandClass=(title:string)=>title.toLowerCase().replace(/[^a-z0-9]+/g,'')

export default function GiftCards(){
  const[products,setProducts]=useState<Product[]>([])
  const[query,setQuery]=useState('')
  useEffect(()=>{api.products().then(items=>setProducts(items.filter(p=>p.category_slug==='gift-cards')))},[])
  const list=useMemo(()=>products.filter(p=>(p.title+' '+p.short_description).toLowerCase().includes(query.toLowerCase())),[products,query])
  return <div className="container page giftPage">
    <section className="giftHero"><div><span className="eyebrow">ЦИФРОВЫЕ КОДЫ</span><h1>Подарочные карты</h1><p>Steam, PlayStation, Telegram, Apple и другие сервисы. Выберите номинал — итоговая цена с комиссией отображается до оформления.</p><div className="giftTrust"><span><Zap/> Обычно до 15 минут</span><span><ShieldCheck/> Проверка региона</span></div></div><Gift className="giftHeroIcon"/></section>
    <div className="giftToolbar"><div><h2>Выберите сервис</h2><p>{list.length} {list.length===1?'карта':'карт в каталоге'}</p></div><label className="giftSearch"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск бренда"/></label></div>
    <div className="giftGrid">{list.map(p=>{const v=[...p.variants].sort((a,b)=>Number(a.price)-Number(b.price))[0];return <Link className="giftCard" to={`/product/${p.slug}`} key={p.id}><div className={`giftLogo ${brandClass(p.title)}`}><span>{p.title}</span></div><div className="giftCardBody"><h3>{p.title}</h3><p>{p.short_description}</p><div className="giftCardFoot"><span>{p.variants.length} номинала</span><b>от {money(v.price)}</b></div></div></Link>})}</div>
    {!list.length&&<div className="empty">Ничего не найдено. Попробуйте другой запрос.</div>}
    <div className="giftInfo"><ShieldCheck/><div><b>Как это работает</b><span>Коды выдаются после подтверждения оплаты. Перед покупкой проверьте регион аккаунта: активированный цифровой код вернуть нельзя.</span></div></div>
  </div>
}
