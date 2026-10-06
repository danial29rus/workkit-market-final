import {FormEvent,useEffect,useMemo,useState} from 'react'
import {Link,useLocation,useNavigate,useParams,useSearchParams} from 'react-router-dom'
import {ArrowRight,CreditCard,LogIn,PackageSearch,ShieldCheck,UserRound} from 'lucide-react'
import {api} from '../api'
import {useSite} from '../site'
import {setArea,useDocumentTitle,useProducts,useUser} from '../hooks'
import {Direction,EmptyState,GiftArt,PageHead,QtyStepper,Skeleton} from '../components/ui'
import {DiscountBox,Totals,usePricing} from '../components/Pricing'
import {GIFT_CATEGORY,money} from '../lib/format'
import {errorText} from '../lib/errors'
import {goToPayment} from '../lib/payments'

export default function Checkout(){
  const{variantId}=useParams()
  const nav=useNavigate()
  const location=useLocation()
  const[params,setParams]=useSearchParams()
  const site=useSite()
  const{user}=useUser()
  const{products,loading}=useProducts()
  const[busy,setBusy]=useState(false)
  const[accepted,setAccepted]=useState(false)
  const[submitError,setSubmitError]=useState('')
  const qty=Math.max(1,Math.min(20,Number(params.get('qty')||1)))
  const found=useMemo(()=>{for(const product of products){const variant=product.variants.find(v=>v.id===Number(variantId));if(variant)return{product,variant}}return null},[products,variantId])
  const isGift=found?.product.category_slug===GIFT_CATEGORY
  useEffect(()=>{if(found)setArea(isGift?'gifts':'services');return()=>setArea(null)},[found,isGift])
  useDocumentTitle('Оформление')
  const subtotal=found?Number(found.variant.price)*qty:0
  const pricing=usePricing(found?`${found.variant.id}x${qty}`:'',(promo,bonus)=>api.quoteOrder(Number(variantId),qty,promo,bonus),subtotal,user)
  const here=location.pathname+location.search

  async function submit(e:FormEvent){
    e.preventDefault()
    if(!found||!user)return
    setBusy(true);setSubmitError('')
    try{
      const order=await api.createOrder(found.variant.id,qty,pricing.applied,pricing.bonus)
      const pay=await goToPayment(order.public_id)
      if(!pay.redirected){nav(`/success?order=${order.public_id}${pay.error?'&pay_error=1':''}`);setBusy(false)}
    }catch(err){setSubmitError(errorText(err,'Не удалось создать заказ'));setBusy(false)}
  }
  if(loading)return <div className="container page"><Skeleton h={60} w="50%"/><div className="cartLayout" style={{marginTop:24}}><Skeleton h={420} r={24}/><Skeleton h={360} r={24}/></div></div>
  if(!found)return <div className="container page"><EmptyState icon={<PackageSearch/>} title="Позиция не найдена" text="Возможно, она снята с продажи. Выберите другой вариант в каталоге."><Link className="btn primary" to="/catalog">Каталог услуг</Link><Link className="btn ghost" to="/gift-cards">Подарочные карты</Link></EmptyState></div>
  const{product,variant}=found
  const maxQty=Math.min(20,variant.stock_quantity??20)
  return <div className="container page">
    <PageHead crumbs={[{label:isGift?'Подарочные карты':site.catalog_label,to:isGift?'/gift-cards':'/catalog'},{label:product.title,to:`/product/${product.slug}`},{label:'Оформление'}]}
      title={isGift?'Оформление подарочной карты':'Оформление заявки'}
      text={isGift?'Код выдаётся только после подтверждения оплаты. Проверьте регион аккаунта перед покупкой.':'Заказ появится в личном кабинете сразу после оформления. Детали задачи уточним после заявки.'}/>
    <form className="cartLayout" onSubmit={submit}>
      <div className="stack">
        <section className="panel">
          <div className="panelHead"><h2><span className="stepNum">1</span>Заказчик</h2></div>
          {user?<div className="customerRow"><span className="avatar lg">{(user.full_name||user.email).slice(0,1).toUpperCase()}</span><div><b>{user.full_name||'Клиент'}</b><span>{user.email}{user.phone?` · ${user.phone}`:''}</span></div><Link className="link" to="/account?tab=profile">Изменить</Link></div>
          :<div className="customerRow guest"><span className="avatar lg"><UserRound size={20}/></span><div><b>Войдите, чтобы оформить</b><span>Заказ сохранится в личном кабинете, а бонусы начислятся на ваш счёт.</span></div><Link className="btn primary" to={`/login?next=${encodeURIComponent(here)}`}><LogIn size={17}/>Войти</Link></div>}
        </section>
        <section className="panel">
          <div className="panelHead"><h2><span className="stepNum">2</span>Скидки</h2></div>
          <DiscountBox p={pricing} user={user} loginNext={here}/>
        </section>
        <section className="panel">
          <div className="panelHead"><h2><span className="stepNum">3</span>Оплата</h2></div>
          <div className="payOption active"><CreditCard size={22}/><div><b>СБП или банковская карта</b><span>После нажатия «{isGift?'Перейти к оплате':site.order_cta}» откроется защищённая страница Mulen Pay. Статус заказа обновится автоматически.</span></div></div>
          <p className="fine"><ShieldCheck size={14}/>Номер карты, срок действия и CVV сайт не запрашивает и не хранит.</p>
        </section>
      </div>
      <aside className="summaryCard">
        <h2>Ваш заказ</h2>
        <div className="summaryItem">
          {isGift?<GiftArt title={product.title} size="sm"/>:<img src={product.image_url} alt=""/>}
          <div><Direction kind={isGift?'gifts':'services'} small/><b>{product.title}</b><span>{isGift?'Номинал':'Пакет'}: {variant.name}</span><small>{money(variant.price)} за шт.</small></div>
        </div>
        {isGift&&<div className="qtyRow"><span className="label">Количество</span><QtyStepper size="sm" value={qty} max={maxQty} onChange={v=>setParams({qty:String(v)},{replace:true})}/></div>}
        <Totals p={pricing}/>
        <label className="accept"><input type="checkbox" checked={accepted} onChange={e=>setAccepted(e.target.checked)}/><span>Принимаю <Link to="/offer" target="_blank">условия оферты</Link> и согласен с <Link to="/privacy" target="_blank">политикой конфиденциальности</Link></span></label>
        {submitError&&<div className="formError" role="alert">{submitError}</div>}
        {user
          ?<button className={`btn ${isGift?'gift':'primary'} lg block`} disabled={busy||!accepted||pricing.loading}>{busy?'Переходим к оплате…':<>{isGift?'Перейти к оплате':site.order_cta}<ArrowRight size={18}/></>}</button>
          :<Link className={`btn ${isGift?'gift':'primary'} lg block`} to={`/login?next=${encodeURIComponent(here)}`}><LogIn size={18}/>Войти и оформить</Link>}
        {user&&!accepted&&<p className="fine center">Отметьте согласие с условиями, чтобы продолжить</p>}
      </aside>
    </form>
  </div>
}
