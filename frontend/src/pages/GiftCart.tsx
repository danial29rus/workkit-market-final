import {useEffect,useMemo,useState} from 'react'
import {Link,useNavigate} from 'react-router-dom'
import {ArrowLeft,ArrowRight,Gift,LogIn,ShieldCheck,ShoppingBag,Trash2} from 'lucide-react'
import {api} from '../api'
import {giftCart} from '../giftCart'
import type {Product,Variant} from '../types'
import {useDocumentTitle,useGiftCart,useProducts,useUser} from '../hooks'
import {Direction,EmptyState,GiftArt,PageHead,QtyStepper,Skeleton,useToast} from '../components/ui'
import {DiscountBox,Totals,usePricing} from '../components/Pricing'
import {money} from '../lib/format'
import {errorText} from '../lib/errors'

type Resolved={product:Product;variant:Variant;quantity:number}

export default function GiftCart(){
  useDocumentTitle('Корзина')
  const nav=useNavigate()
  const toast=useToast()
  const{products,loading}=useProducts()
  const{lines}=useGiftCart()
  const{user}=useUser()
  const[busy,setBusy]=useState(false)
  const[submitError,setSubmitError]=useState('')
  const items=useMemo<Resolved[]>(()=>lines.flatMap(line=>{
    for(const product of products){const variant=product.variants.find(v=>v.id===line.variantId);if(variant)return[{product,variant,quantity:line.quantity}]}
    return[]
  }),[lines,products])
  // Drop lines whose nominal was removed from the catalog so the header count stays honest.
  useEffect(()=>{if(!loading&&products.length)lines.filter(l=>!items.some(i=>i.variant.id===l.variantId)).forEach(l=>giftCart.remove(l.variantId))},[loading,products.length,lines,items])
  const payload=items.map(i=>({variant_id:i.variant.id,quantity:i.quantity}))
  const basketKey=payload.map(i=>`${i.variant_id}x${i.quantity}`).join(',')
  const subtotal=items.reduce((s,i)=>s+Number(i.variant.price)*i.quantity,0)
  const count=items.reduce((s,i)=>s+i.quantity,0)
  const pricing=usePricing(basketKey,(promo,bonus)=>api.quoteGiftCart(payload,promo,bonus),subtotal,user)

  function remove(item:Resolved){
    giftCart.remove(item.variant.id)
    toast({title:'Удалено из корзины',text:`${item.product.title} · ${item.variant.name}`})
  }
  async function submit(){
    if(!user||!items.length)return
    setBusy(true);setSubmitError('')
    try{
      const order=await api.createGiftCart(payload,pricing.applied,pricing.bonus)
      giftCart.clear()
      nav(`/success?order=${order.public_id}`)
    }catch(e){setSubmitError(errorText(e,'Не удалось создать заказ'))}
    finally{setBusy(false)}
  }

  const head=<PageHead crumbs={[{label:'Подарочные карты',to:'/gift-cards'},{label:'Корзина'}]} title={<>Корзина <Direction kind="gifts"/></>} text="Соберите разные сервисы и номиналы в один заказ — коды выдадим вместе после оплаты. Услуги для бизнеса оформляются отдельной заявкой."/>
  if(loading&&lines.length)return <div className="container page">{head}<div className="cartLayout"><div className="stack">{lines.map(l=><Skeleton key={l.variantId} h={96} r={18}/>)}</div><Skeleton h={360} r={24}/></div></div>
  if(!items.length)return <div className="container page">{head}<EmptyState icon={<ShoppingBag/>} title="Корзина пуста" text="Добавьте подарочные карты — разные сервисы и номиналы можно оплатить одним заказом."><Link className="btn gift lg" to="/gift-cards"><Gift size={18}/>Выбрать подарочную карту</Link></EmptyState></div>
  return <div className="container page">
    {head}
    <div className="cartLayout">
      <section className="stack">
        {items.map(item=>{const max=Math.min(20,item.variant.stock_quantity??20);return <article className="cartItem" key={item.variant.id}>
          <Link to={`/product/${item.product.slug}`} className="cartArt"><GiftArt title={item.product.title} size="sm"/></Link>
          <div className="cartInfo">
            <Link to={`/product/${item.product.slug}`}><b>{item.product.title}</b></Link>
            <span>Номинал {item.variant.name}{item.variant.commission_percent?` · комиссия ${Number(item.variant.commission_percent).toLocaleString('ru-RU')}%`:''}</span>
            <small>{money(item.variant.price)} за шт.</small>
          </div>
          <QtyStepper size="sm" value={item.quantity} max={max} onChange={q=>giftCart.update(item.variant.id,q)}/>
          <b className="cartLineTotal">{money(Number(item.variant.price)*item.quantity)}</b>
          <button className="iconBtn subtle" onClick={()=>remove(item)} aria-label="Удалить"><Trash2 size={18}/></button>
        </article>})}
        <div className="cartBelow"><Link className="link" to="/gift-cards"><ArrowLeft size={16}/>Продолжить выбор</Link><button className="textBtn" onClick={()=>giftCart.clear()}>Очистить корзину</button></div>
      </section>
      <aside className="summaryCard">
        <h2>Оформление</h2>
        <DiscountBox p={pricing} user={user} loginNext="/gift-cart"/>
        <Totals p={pricing} count={count}/>
        {submitError&&<div className="formError" role="alert">{submitError}</div>}
        {user
          ?<button className="btn gift lg block" onClick={submit} disabled={busy||pricing.loading}>{busy?'Создаём заказ…':<>Оформить заказ<ArrowRight size={18}/></>}</button>
          :<Link className="btn gift lg block" to="/login?next=%2Fgift-cart"><LogIn size={18}/>Войти и оформить</Link>}
        <p className="fine"><ShieldCheck size={14}/>Коды выдаются в одном заказе после подтверждения оплаты.{!user&&' Корзина сохранится после входа.'}</p>
      </aside>
    </div>
  </div>
}
