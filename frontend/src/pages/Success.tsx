import {useEffect,useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {Check,Clock3,Copy,Gift,KeyRound,ListChecks,Loader2} from 'lucide-react'
import {api,session} from '../api'
import type {Order} from '../types'
import {useDocumentTitle} from '../hooks'
import {Skeleton,StatusBadge,useToast} from '../components/ui'
import PayButton from '../components/PayButton'
import {money} from '../lib/format'
import {LAST_ORDER_KEY} from '../lib/payments'

const PAID=['paid','in_progress','completed']

export default function Success(){
  const[q]=useSearchParams()
  const nav=useNavigate()
  const toast=useToast()
  const[o,setO]=useState<Order|null>(null)
  const[error,setError]=useState('')
  const[polling,setPolling]=useState(false)
  // Coming back from Mulen Pay there may be no ?order=, so fall back to the order we sent there.
  const id=q.get('order')||(()=>{try{return localStorage.getItem(LAST_ORDER_KEY)||''}catch{return ''}})()
  const payError=q.get('pay_error')==='1'
  const paid=!!o&&PAID.includes(o.status)
  useDocumentTitle(paid?'Оплата прошла':'Заказ создан')
  useEffect(()=>{
    if(!session.token()){nav(`/login?next=${encodeURIComponent('/success?order='+id)}`);return}
    if(!id){nav('/account?tab=orders',{replace:true});return}
    api.order(id).then(setO).catch(e=>setError(e.message))
  },[id,nav])
  // The payment webhook can arrive a few seconds after the redirect back, so re-check for a while.
  useEffect(()=>{
    if(!o||o.status!=='awaiting_payment'||payError||!o.items.length)return
    setPolling(true)
    let n=0
    const t=setInterval(()=>{n++;api.order(o.public_id).then(x=>{if(x.status!=='awaiting_payment'){setO(x);clearInterval(t);setPolling(false)}}).catch(()=>{});if(n>=20){clearInterval(t);setPolling(false)}},3000)
    return()=>clearInterval(t)
  },[o?.public_id,o?.status,payError])
  const isGift=o?.items.every(i=>i.delivery_type==='gift_card')
  function copy(){navigator.clipboard?.writeText(o!.public_id).then(()=>toast({title:'Номер заказа скопирован'}))}
  return <div className="container page narrow">
    <div className="successCard">
      <div className={`successMark${o&&!paid?' pending':''}`}>{o&&!paid?<Clock3 size={38}/>:<Check size={40} strokeWidth={3}/>}</div>
      <h1>{paid?'Оплата прошла':'Заказ создан'}</h1>
      <p className="muted">{paid
        ?(isGift?'Спасибо! Коды доступны в заказе в личном кабинете.':'Спасибо! Мы приступаем к работе — статус будет обновляться в кабинете.')
        :payError?'Заказ сохранён, но перейти к оплате не получилось. Попробуйте ещё раз — сумма и состав не изменятся.'
        :'Заказ ожидает оплаты. Если вы уже оплатили, статус обновится автоматически в течение минуты.'}</p>
      {error&&<div className="formError">{error}</div>}
      {!o&&!error&&<div className="stack"><Skeleton h={56} r={14}/><Skeleton h={120} r={14}/></div>}
      {o&&<>
        <div className="orderHead"><div><span className="label">Номер заказа</span><button className="orderId" onClick={copy} title="Скопировать">{o.public_id}<Copy size={15}/></button></div><StatusBadge status={o.status}/></div>
        {polling&&<p className="fine center"><Loader2 size={14} className="spin"/>Проверяем статус оплаты…</p>}
        <div className="orderLines">{o.items.map((i,k)=><div key={k}><span className="lineIcon">{i.delivery_type==='gift_card'?<Gift size={16}/>:<ListChecks size={16}/>}</span><span className="grow"><b>{i.title}</b><small>{i.variant} × {i.quantity}</small></span><b>{money(Number(i.unit_price)*i.quantity)}</b></div>)}</div>
        <div className="totals compact">
          {Number(o.promo_discount_amount)>0&&<div className="minus"><span>Промокод {o.promo_code}</span><b>−{money(o.promo_discount_amount)}</b></div>}
          {Number(o.bonus_spent_amount)>0&&<div className="minus"><span>Бонусы</span><b>−{money(o.bonus_spent_amount)}</b></div>}
          <div className="grand"><span>{paid?'Оплачено':'К оплате'}</span><b>{money(o.total_amount)}</b></div>
        </div>
        {isGift&&<div className="noteBox"><KeyRound size={16}/><span>Код будет доступен только вам — в разделе «Заказы» личного кабинета.</span></div>}
        {o.status==='awaiting_payment'&&<PayButton publicId={o.public_id} amount={o.total_amount} className="btn primary lg block"/>}
      </>}
      <div className="successActions"><Link className={`btn ${o?.status==='awaiting_payment'?'ghost':'primary'} lg`} to="/account?tab=orders">Перейти к заказам</Link><Link className="btn ghost lg" to={isGift?'/gift-cards':'/catalog'}>{isGift?'Ещё подарочные карты':'Другие услуги'}</Link></div>
    </div>
  </div>
}
