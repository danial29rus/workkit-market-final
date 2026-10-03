import {useMemo} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {BriefcaseBusiness,Gift,KeyRound,Search,SearchX,ShieldCheck,ShoppingBag,X,Zap} from 'lucide-react'
import {CardSkeleton,GiftBrandCard} from '../components/ProductCard'
import {EmptyState,GiftArt,Reveal} from '../components/ui'
import {useDocumentTitle,useGiftCart,useProducts} from '../hooks'
import type {Product} from '../types'
import {GIFT_CATEGORY,plural} from '../lib/format'

const minPriceOf=(x:Product)=>Math.min(...x.variants.map(v=>Number(v.price)))
const SORTS={popular:'Популярные',price_asc:'Сначала дешевле',price_desc:'Сначала дороже',name:'По названию'} as const
type Sort=keyof typeof SORTS

export default function GiftCards(){
  useDocumentTitle('Подарочные карты')
  const{products,loading}=useProducts()
  const{count}=useGiftCart()
  const[params,setParams]=useSearchParams()
  const query=params.get('q')||''
  const sort=(params.get('sort')||'popular') as Sort
  const cur=params.get('cur')||'all'
  function set(key:string,value:string|null){const n=new URLSearchParams(params);if(!value)n.delete(key);else n.set(key,value);setParams(n,{replace:true})}
  const gifts=useMemo(()=>products.filter(p=>p.category_slug===GIFT_CATEGORY),[products])
  const currencies=useMemo(()=>Array.from(new Set(gifts.flatMap(p=>p.variants.map(v=>v.face_currency)))).sort(),[gifts])
  const list=useMemo(()=>{
    const t=query.trim().toLowerCase()
    let l=gifts.filter(p=>(p.title+' '+p.short_description).toLowerCase().includes(t))
    if(cur!=='all')l=l.filter(p=>p.variants.some(v=>v.face_currency===cur))
    if(sort==='price_asc')l=[...l].sort((a,b)=>minPriceOf(a)-minPriceOf(b))
    if(sort==='price_desc')l=[...l].sort((a,b)=>minPriceOf(b)-minPriceOf(a))
    if(sort==='name')l=[...l].sort((a,b)=>a.title.localeCompare(b.title,'en'))
    return l
  },[gifts,query,sort,cur])
  return <div className="giftPage">
    <section className="giftHero">
      <div className="container giftHeroGrid">
        <div>
          <span className="direction gifts onDark"><Gift size={15}/>Подарочные карты</span>
          <h1>Цифровые коды для любимых сервисов</h1>
          <p>Выберите сервис и номинал — итоговая цена с комиссией видна сразу. Разные карты можно собрать в одну корзину и оплатить одним заказом.</p>
          <div className="giftTrust"><span><Zap size={16}/>Выдача обычно до 15 минут</span><span><ShieldCheck size={16}/>Проверка региона</span><span><KeyRound size={16}/>Код только в вашем кабинете</span></div>
        </div>
        <div className="giftHeroArt" aria-hidden="true">
          {(gifts.length?gifts.slice(0,3).map(g=>g.title):['Steam','PlayStation Store','Apple Gift Card']).map((t,i)=><div key={t} className={`fan f${i}`}><GiftArt title={t}/></div>)}
        </div>
      </div>
    </section>
    <div className="container page tightTop">
      <div className="toolbar sticky">
        <label className="inputIcon grow"><Search size={18}/><input value={query} onChange={e=>set('q',e.target.value)} placeholder="Steam, PlayStation, Apple…"/>{query&&<button aria-label="Очистить" onClick={()=>set('q',null)}><X size={16}/></button>}</label>
        {currencies.length>1&&<div className="segmented" role="group" aria-label="Валюта номинала">
          <button className={cur==='all'?'active':''} onClick={()=>set('cur',null)}>Все</button>
          {currencies.map(c=><button key={c} className={cur===c?'active':''} onClick={()=>set('cur',c)}>{c==='RUB'?'₽':c}</button>)}
        </div>}
        <select className="select" value={sort} onChange={e=>set('sort',e.target.value==='popular'?null:e.target.value)} aria-label="Сортировка">{Object.entries(SORTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        {count>0&&<Link className="btn gift" to="/gift-cart"><ShoppingBag size={17}/>Корзина · {count}</Link>}
      </div>
      <div className="resultLine">{loading?'Загружаем…':`${list.length} ${plural(list.length,['сервис','сервиса','сервисов'])}`}</div>
      {loading?<div className="giftGrid">{Array.from({length:6},(_,i)=><CardSkeleton gift key={i}/>)}</div>
      :list.length?<div className="giftGrid">{list.map((p,i)=><div className="fadeIn" style={{animationDelay:`${Math.min(i,8)*45}ms`}} key={p.id}><GiftBrandCard p={p}/></div>)}</div>
      :<EmptyState icon={<SearchX/>} title="Такой карты пока нет" text="Попробуйте другое название или сбросьте фильтры. Напишите нам — добавим нужный сервис."><button className="btn ghost" onClick={()=>setParams({},{replace:true})}>Сбросить</button><Link className="btn primary" to="/contacts">Предложить сервис</Link></EmptyState>}
      <Reveal className="infoGrid">
        <div><span className="infoIcon"><ShieldCheck size={20}/></span><b>Проверьте регион</b><p>Код активируется только в аккаунте подходящего региона. Активированный цифровой код вернуть нельзя.</p></div>
        <div><span className="infoIcon"><KeyRound size={20}/></span><b>Где искать код</b><p>После подтверждения оплаты код и инструкция появятся в заказе в личном кабинете.</p></div>
        <div><span className="infoIcon"><BriefcaseBusiness size={20}/></span><b>Нужны услуги?</b><p>Услуги для бизнеса оформляются отдельной заявкой. <Link to="/catalog">Перейти в каталог услуг →</Link></p></div>
      </Reveal>
    </div>
  </div>
}
