import {Link} from 'react-router-dom'
import {ArrowUpRight,Clock3} from 'lucide-react'
import type {Product} from '../types'
import {money,plural} from '../lib/format'
import {GiftArt,Skeleton} from './ui'

const cheapest=(p:Product)=>[...p.variants].sort((a,b)=>Number(a.price)-Number(b.price))[0]
export const timingOf=(p:Product)=>p.description.split('\n').find(l=>/^срок/i.test(l.trim()))?.replace(/^Срок (выполнения|выдачи):\s*/i,'').replace(/\.$/,'')

export default function ProductCard({p}:{p:Product}){
  const v=cheapest(p)
  const timing=timingOf(p)
  return <Link className="productCard" to={`/product/${p.slug}`}>
    <div className="pcImage"><img src={p.image_url} alt="" loading="lazy" decoding="async"/><span className="pcBadge">{p.category_name}</span></div>
    <div className="pcBody">
      <h3>{p.title}</h3>
      <p>{p.short_description}</p>
      {timing&&<span className="pcMeta"><Clock3 size={14}/>{timing}</span>}
      <div className="pcFoot">
        <div className="pcPrice"><small>{p.variants.length>1?`${p.variants.length} ${plural(p.variants.length,['пакет','пакета','пакетов'])} · от`:'Фиксированная цена'}</small><strong>{money(v.price)}</strong>{v.old_price&&<del>{money(v.old_price)}</del>}</div>
        <span className="pcGo" aria-hidden="true"><ArrowUpRight size={18}/></span>
      </div>
    </div>
  </Link>
}

export function GiftBrandCard({p}:{p:Product}){
  const v=cheapest(p)
  const inStock=p.variants.some(x=>x.stock_quantity===null||x.stock_quantity>0)
  return <Link className="giftBrandCard" to={`/product/${p.slug}`}>
    <GiftArt title={p.title}/>
    <div className="gbBody">
      <div><h3>{p.title}</h3><p>{p.short_description}</p></div>
      <div className="gbFoot"><span className={`stockDot${inStock?'':' out'}`}>{inStock?`${p.variants.length} ${plural(p.variants.length,['номинал','номинала','номиналов'])}`:'Нет в наличии'}</span><b>от {money(v.price)}</b></div>
    </div>
  </Link>
}

export function CardSkeleton({gift}:{gift?:boolean}){
  return <div className={gift?'giftBrandCard skeletonCard':'productCard skeletonCard'}>
    <Skeleton h={gift?undefined:'12rem'} r={0} className={gift?'giftArt md':''}/>
    <div className={gift?'gbBody':'pcBody'}><Skeleton h={20} w="70%"/><Skeleton h={14}/><Skeleton h={14} w="55%"/><Skeleton h={24} w="40%"/></div>
  </div>
}
