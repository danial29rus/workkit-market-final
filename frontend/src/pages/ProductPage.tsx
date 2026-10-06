import {useEffect,useMemo,useState} from 'react'
import {Link,useNavigate,useParams} from 'react-router-dom'
import {ArrowRight,Check,Clock3,FileCheck2,Info,KeyRound,PackageSearch,ShieldCheck,ShoppingBag,UserRound,Zap} from 'lucide-react'
import {api} from '../api'
import {giftCart} from '../giftCart'
import type {Product,Variant} from '../types'
import {useSite} from '../site'
import {setArea,useDocumentTitle,useGiftCart,useProducts} from '../hooks'
import {Direction,EmptyState,GiftArt,QtyStepper,Reveal,Skeleton,useToast} from '../components/ui'
import ProductCard,{timingOf} from '../components/ProductCard'
import {GIFT_CATEGORY,money,plural} from '../lib/format'

export default function ProductPage(){
  const{slug}=useParams()
  const[p,setP]=useState<Product|null>(null)
  const[error,setError]=useState('')
  useEffect(()=>{
    setP(null);setError('')
    if(slug)api.product(slug).then(x=>{setP(x);setArea(x.category_slug===GIFT_CATEGORY?'gifts':'services')}).catch(e=>setError(e.message))
    return()=>setArea(null)
  },[slug])
  useDocumentTitle(p?.title||'')
  if(error)return <div className="container page"><EmptyState icon={<PackageSearch/>} title="Товар не найден" text={error}><Link className="btn primary" to="/catalog">Каталог услуг</Link><Link className="btn ghost" to="/gift-cards">Подарочные карты</Link></EmptyState></div>
  if(!p)return <div className="container page"><div className="detailGrid"><Skeleton h="26rem" r={24}/><div className="stack"><Skeleton h={22} w="30%"/><Skeleton h={48} w="80%"/><Skeleton h={18}/><Skeleton h={18} w="70%"/><Skeleton h={64} r={14}/><Skeleton h={64} r={14}/><Skeleton h={52} r={14}/></div></div></div>
  return p.category_slug===GIFT_CATEGORY?<GiftCardProduct p={p}/>:<ServiceProduct p={p}/>
}

function ServiceProduct({p}:{p:Product}){
  const site=useSite()
  const[selected,setSelected]=useState(p.variants[0]?.id)
  const{products}=useProducts()
  const v=p.variants.find(x=>x.id===selected)||p.variants[0]
  const lines=p.description.split('\n').map(s=>s.trim()).filter(Boolean)
  const timing=timingOf(p)
  const rest=lines.filter(l=>!/^срок/i.test(l))
  const[intro,...points]=rest
  const related=products.filter(x=>x.category_slug!==GIFT_CATEGORY&&x.id!==p.id).sort((a,b)=>Number(b.category_slug===p.category_slug)-Number(a.category_slug===p.category_slug)).slice(0,3)
  return <div className="container page">
    <nav className="crumbs"><span><Link to="/">Главная</Link></span><span><Link to="/catalog">{site.catalog_label}</Link></span><span><Link to={`/catalog?cat=${p.category_slug}`}>{p.category_name}</Link></span></nav>
    <div className="detailGrid">
      <div className="stack">
        <div className="detailImage"><img src={p.image_url} alt=""/><span className="pcBadge">{p.category_name}</span></div>
        <Reveal as="section" className="panel">
          <h2>Что входит</h2>
          {intro&&<p className="lead">{intro}</p>}
          {points.length>0&&<ul className="checkList">{points.map((line,i)=><li key={i}><Check size={16}/><span>{line}</span></li>)}</ul>}
          <div className="featureRow"><div><FileCheck2 size={18}/>Фиксированный состав</div><div><Clock3 size={18}/>{timing||'Сроки согласуем'}</div><div><UserRound size={18}/>Статус в кабинете</div></div>
        </Reveal>
      </div>
      <aside className="buyCard">
        <Direction kind="services" small/>
        <h1>{p.title}</h1>
        <p className="muted">{p.short_description}</p>
        <div className="priceBlock"><span key={v.id} className="bigPrice tick">{money(v.price)}</span>{v.old_price&&<del>{money(v.old_price)}</del>}{v.old_price&&<span className="saveTag">−{Math.round((1-Number(v.price)/Number(v.old_price))*100)}%</span>}</div>
        {p.variants.length>1&&<><span className="label">Выберите пакет</span>
        <div className="optionList" role="radiogroup">{p.variants.map(x=><button key={x.id} role="radio" aria-checked={selected===x.id} onClick={()=>setSelected(x.id)} className={`option${selected===x.id?' active':''}`}><i className="radio"/><span>{x.name}</span><b>{money(x.price)}</b></button>)}</div></>}
        <Link className="btn primary lg block" to={`/checkout/${v.id}`}>{site.order_cta}<ArrowRight size={18}/></Link>
        <ul className="miniList"><li><ShieldCheck size={16}/>Оплата только после подтверждения заказа</li><li><Clock3 size={16}/>{timing?`Срок: ${timing}`:'Срок фиксируется в заявке'}</li></ul>
      </aside>
    </div>
    <div className="mobileBuy"><div><small>{v.name}</small><b>{money(v.price)}</b></div><Link className="btn primary" to={`/checkout/${v.id}`}>{site.order_cta}</Link></div>
    {related.length>0&&<section className="section"><div className="sectionHead"><h2>Похожие услуги</h2><Link className="link" to="/catalog">Весь каталог<ArrowRight size={16}/></Link></div><div className="productGrid three">{related.map(x=><ProductCard key={x.id} p={x}/>)}</div></section>}
  </div>
}

function GiftCardProduct({p}:{p:Product}){
  const nav=useNavigate()
  const toast=useToast()
  const{lines}=useGiftCart()
  const available=(v:Variant)=>v.stock_quantity===null||v.stock_quantity>0
  const[selected,setSelected]=useState<number>(()=>(p.variants.find(available)||p.variants[0]).id)
  const[qty,setQty]=useState(1)
  const v=p.variants.find(x=>x.id===selected)||p.variants[0]
  const inCart=lines.find(l=>l.variantId===v.id)?.quantity||0
  const maxQty=Math.max(1,Math.min(20-inCart,v.stock_quantity??20))
  useEffect(()=>{setQty(q=>Math.min(q,maxQty))},[maxQty])
  const facts=useMemo(()=>p.description.split('\n').map(s=>s.trim()).filter(Boolean).slice(1).filter(l=>!/^выберите/i.test(l)),[p])
  const face=v.face_value?`${Number(v.face_value).toLocaleString('ru-RU')} ${v.face_currency==='RUB'?'₽':v.face_currency}`:v.name
  const soldOut=!available(v)
  const cartFull=inCart>=20||(v.stock_quantity!==null&&inCart>=v.stock_quantity)
  function add(){
    giftCart.add(v.id,qty)
    toast({title:'Добавлено в корзину',text:`${p.title} · ${v.name} × ${qty}`,action:{label:'В корзину',to:'/gift-cart'}})
    setQty(1)
  }
  return <div className="container page">
    <nav className="crumbs"><span><Link to="/">Главная</Link></span><span><Link to="/gift-cards">Подарочные карты</Link></span><span>{p.title}</span></nav>
    <div className="giftDetail">
      <div className="stack">
        <div className="giftDetailHead">
          <GiftArt title={p.title} size="lg"/>
          <div><Direction kind="gifts" small/><h1>{p.title}</h1><p className="muted">{p.short_description}</p>
          <div className="pillRow"><span><Zap size={15}/>Обычно до 15 минут</span><span><KeyRound size={15}/>Код в личном кабинете</span></div></div>
        </div>
        <section className="panel">
          <div className="panelHead"><h2>Номинал</h2><span className="muted">{p.variants.length} {plural(p.variants.length,['вариант','варианта','вариантов'])} · цена с комиссией</span></div>
          <div className="nominalGrid" role="radiogroup">{p.variants.map(x=>{const out=!available(x);return <button key={x.id} role="radio" aria-checked={x.id===v.id} disabled={out} className={`nominal${x.id===v.id?' active':''}`} onClick={()=>{setSelected(x.id);setQty(1)}}>
            <b>{x.name}</b><span>{out?'Нет в наличии':money(x.price)}</span>{x.old_price&&!out&&<del>{money(x.old_price)}</del>}
          </button>})}</div>
        </section>
        {facts.length>0&&<section className="panel"><h2>Как получить и активировать</h2><ul className="checkList">{facts.map((f,i)=><li key={i}><Check size={16}/><span>{f}</span></li>)}</ul></section>}
      </div>
      <aside className="buyCard gift">
        <span className="label">Ваш выбор</span>
        <div className="calcRows">
          <div><span>Номинал</span><b>{face}</b></div>
          {v.exchange_rate&&<div><span>Курс</span><b>1 {v.face_currency} = {Number(v.exchange_rate).toLocaleString('ru-RU')} ₽</b></div>}
          {v.commission_percent&&<div><span>Комиссия сервиса</span><b>{Number(v.commission_percent).toLocaleString('ru-RU')}%</b></div>}
          <div><span>Цена за 1 шт.</span><b>{money(v.price)}</b></div>
          <div><span>В наличии</span><b className={soldOut?'danger':'ok'}>{v.stock_quantity===null?'Есть':soldOut?'Нет':`${v.stock_quantity} шт.`}</b></div>
        </div>
        <div className="qtyRow"><span className="label">Количество</span><QtyStepper value={qty} onChange={setQty} max={maxQty}/></div>
        <div className="giftTotal"><span>Итого</span><b key={qty+'-'+v.id} className="tick">{money(Number(v.price)*qty)}</b></div>
        <button className="btn gift lg block" onClick={add} disabled={soldOut||cartFull}><ShoppingBag size={18}/>{cartFull?'Максимум уже в корзине':'Добавить в корзину'}</button>
        <button className="btn ghost lg block" onClick={()=>nav(`/checkout/${v.id}?qty=${qty}`)} disabled={soldOut}>Купить сейчас</button>
        {inCart>0&&<Link className="inCartNote" to="/gift-cart"><Check size={15}/>В корзине уже {inCart} шт. этого номинала — открыть корзину</Link>}
        <div className="noteBox"><Info size={16}/><span>Перед покупкой проверьте регион аккаунта. Активированный цифровой код вернуть нельзя.</span></div>
      </aside>
    </div>
    <div className="mobileBuy"><div><small>{v.name} × {qty}</small><b>{money(Number(v.price)*qty)}</b></div><button className="btn gift" onClick={add} disabled={soldOut||cartFull}><ShoppingBag size={17}/>В корзину</button></div>
  </div>
}
