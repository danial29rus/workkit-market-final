import {useMemo,useState} from 'react'
import {Link,useSearchParams} from 'react-router-dom'
import {ArrowRight,Gift,RotateCcw,Search,SearchX,SlidersHorizontal,X} from 'lucide-react'
import ProductCard,{CardSkeleton} from '../components/ProductCard'
import {Direction,EmptyState,PageHead} from '../components/ui'
import {useSite} from '../site'
import {useDocumentTitle,useProducts} from '../hooks'
import type {Product} from '../types'
import {GIFT_CATEGORY,money,plural} from '../lib/format'

const minPriceOf=(x:Product)=>Math.min(...x.variants.map(v=>Number(v.price)))
const SORTS={recommended:'Рекомендуемые',price_asc:'Сначала дешевле',price_desc:'Сначала дороже',name:'По названию'} as const
type Sort=keyof typeof SORTS

export default function Catalog(){
  const site=useSite()
  useDocumentTitle(site.catalog_label)
  const{products,loading,error,reload}=useProducts()
  const[params,setParams]=useSearchParams()
  const[filtersOpen,setFiltersOpen]=useState(false)
  const q=params.get('q')||''
  const cat=params.get('cat')||'all'
  const sort=(params.get('sort')||'recommended') as Sort
  const services=useMemo(()=>products.filter(p=>p.category_slug!==GIFT_CATEGORY),[products])
  const ceiling=useMemo(()=>services.length?Math.ceil(Math.max(...services.map(minPriceOf))/500)*500:7000,[services])
  const maxPrice=Number(params.get('max'))||ceiling
  function set(key:string,value:string|null){
    const next=new URLSearchParams(params)
    if(value===null||value==='')next.delete(key);else next.set(key,value)
    setParams(next,{replace:true})
  }
  const cats=useMemo(()=>{
    const map=new Map<string,{name:string;count:number}>()
    services.forEach(p=>{const c=map.get(p.category_slug);map.set(p.category_slug,{name:p.category_name,count:(c?.count||0)+1})})
    return Array.from(map,([slug,v])=>({slug,...v})).sort((a,b)=>a.name.localeCompare(b.name,'ru'))
  },[services])
  const term=q.trim().toLowerCase()
  const filtered=useMemo(()=>{
    let list=cat==='all'?services:services.filter(x=>x.category_slug===cat)
    if(term)list=list.filter(x=>(x.title+' '+x.short_description+' '+x.category_name).toLowerCase().includes(term))
    list=list.filter(x=>minPriceOf(x)<=maxPrice)
    if(sort==='price_asc')list=[...list].sort((a,b)=>minPriceOf(a)-minPriceOf(b))
    if(sort==='price_desc')list=[...list].sort((a,b)=>minPriceOf(b)-minPriceOf(a))
    if(sort==='name')list=[...list].sort((a,b)=>a.title.localeCompare(b.title,'ru'))
    return list
  },[services,cat,term,maxPrice,sort])
  // If the query matches gift cards, point there instead of silently showing nothing.
  const giftMatches=useMemo(()=>term?products.filter(p=>p.category_slug===GIFT_CATEGORY&&(p.title+' '+p.short_description).toLowerCase().includes(term)):[],[products,term])
  const dirty=cat!=='all'||!!term||maxPrice<ceiling||sort!=='recommended'
  const reset=()=>setParams({}, {replace:true})

  const filterPanel=<>
    <div className="filterGroup"><b>Направление</b>
      <button className={`filterItem${cat==='all'?' active':''}`} onClick={()=>set('cat',null)}><span>Все услуги</span><small>{services.length}</small></button>
      {cats.map(c=><button key={c.slug} className={`filterItem${cat===c.slug?' active':''}`} onClick={()=>set('cat',c.slug)}><span>{c.name}</span><small>{c.count}</small></button>)}
    </div>
    <div className="filterGroup"><b>Цена до</b>
      <input type="range" className="range" style={{'--p':`${(maxPrice-500)/(ceiling-500||1)*100}%`} as React.CSSProperties} min={500} max={ceiling} step={100} value={maxPrice} onChange={e=>set('max',Number(e.target.value)>=ceiling?null:e.target.value)}/>
      <div className="rangeLegend"><span>{money(500)}</span><b>{money(maxPrice)}</b></div>
    </div>
    {dirty&&<button className="btn ghost sm block" onClick={reset}><RotateCcw size={15}/>Сбросить фильтры</button>}
  </>

  return <div className="container page">
    <PageHead crumbs={[{label:'Главная',to:'/'},{label:site.catalog_label}]} title={<>{site.catalog_label} <Direction kind="services"/></>} text="Готовые пакеты работ с фиксированной стоимостью. Выберите подходящий вариант — детали уточним после оформления."/>
    <div className="crossNote"><Gift size={18}/><span>Ищете коды Steam, PlayStation или Apple? Подарочные карты — в отдельной витрине.</span><Link to="/gift-cards">Перейти<ArrowRight size={15}/></Link></div>
    <div className="catalogLayout">
      <aside className="filters hideMobile">{filterPanel}</aside>
      <section>
        <div className="toolbar">
          <label className="inputIcon grow"><Search size={18}/><input value={q} onChange={e=>set('q',e.target.value)} placeholder="Поиск по услугам"/>{q&&<button aria-label="Очистить" onClick={()=>set('q',null)}><X size={16}/></button>}</label>
          <button className="btn ghost showMobile" onClick={()=>setFiltersOpen(true)}><SlidersHorizontal size={17}/>Фильтры{dirty&&<i className="dot"/>}</button>
          <select className="select" value={sort} onChange={e=>set('sort',e.target.value==='recommended'?null:e.target.value)} aria-label="Сортировка">{Object.entries(SORTS).map(([k,v])=><option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div className="chipsScroll showMobile">
          <button className={`chip${cat==='all'?' active':''}`} onClick={()=>set('cat',null)}>Все</button>
          {cats.map(c=><button key={c.slug} className={`chip${cat===c.slug?' active':''}`} onClick={()=>set('cat',c.slug)}>{c.name}</button>)}
        </div>
        <div className="resultLine">{loading?'Загружаем…':`${filtered.length} ${plural(filtered.length,['предложение','предложения','предложений'])}`}</div>
        {error?<EmptyState icon={<SearchX/>} title="Не удалось загрузить каталог" text={error}><button className="btn primary" onClick={reload}>Повторить</button></EmptyState>
        :loading?<div className="productGrid three">{Array.from({length:6},(_,i)=><CardSkeleton key={i}/>)}</div>
        :filtered.length>0?<div className="productGrid three">{filtered.map((x,i)=><div className="fadeIn" style={{animationDelay:`${Math.min(i,8)*40}ms`}} key={x.id}><ProductCard p={x}/></div>)}</div>
        :<EmptyState icon={<SearchX/>} title="Ничего не найдено" text={giftMatches.length?'Среди услуг совпадений нет, но есть подарочные карты:':'Попробуйте изменить запрос или сбросить фильтры.'}>
          {giftMatches.slice(0,3).map(g=><Link key={g.id} className="btn gift" to={`/product/${g.slug}`}><Gift size={16}/>{g.title}</Link>)}
          {dirty&&<button className="btn ghost" onClick={reset}><RotateCcw size={16}/>Сбросить фильтры</button>}
        </EmptyState>}
      </section>
    </div>
    {filtersOpen&&<div className="sheet" role="dialog" aria-label="Фильтры" onClick={()=>setFiltersOpen(false)}>
      <div className="sheetPanel" onClick={e=>e.stopPropagation()}>
        <div className="sheetHead"><b>Фильтры</b><button className="iconBtn" aria-label="Закрыть" onClick={()=>setFiltersOpen(false)}><X size={20}/></button></div>
        {filterPanel}
        <button className="btn primary block lg" onClick={()=>setFiltersOpen(false)}>Показать {filtered.length} {plural(filtered.length,['предложение','предложения','предложений'])}</button>
      </div>
    </div>}
  </div>
}
