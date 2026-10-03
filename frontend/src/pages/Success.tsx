import {useEffect,useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {Check,Copy,Gift,KeyRound,ListChecks} from 'lucide-react'
import {api,session} from '../api'
import type {Order} from '../types'
import {useDocumentTitle} from '../hooks'
import {Skeleton,StatusBadge,useToast} from '../components/ui'
import {money} from '../lib/format'

export default function Success(){
  useDocumentTitle('Заказ создан')
  const[q]=useSearchParams()
  const nav=useNavigate()
  const toast=useToast()
  const[o,setO]=useState<Order|null>(null)
  const[error,setError]=useState('')
  const id=q.get('order')||''
  useEffect(()=>{if(!session.token()){nav(`/login?next=${encodeURIComponent('/success?order='+id)}`);return}if(id)api.order(id).then(setO).catch(e=>setError(e.message))},[id,nav])
  const isGift=o?.items.every(i=>i.delivery_type==='gift_card')
  function copy(){navigator.clipboard?.writeText(o!.public_id).then(()=>toast({title:'Номер заказа скопирован'}))}
  return <div className="container page narrow">
    <div className="successCard">
      <div className="successMark"><Check size={40} strokeWidth={3}/></div>
      <h1>Заказ создан</h1>
      <p className="muted">{isGift?'Коды появятся в заказе в личном кабинете сразу после подтверждения оплаты.':'Заказ сохранён в личном кабинете. Как только оплата будет подтверждена, мы приступим к работе.'}</p>
      {error&&<div className="formError">{error}</div>}
      {!o&&!error&&<div className="stack"><Skeleton h={56} r={14}/><Skeleton h={120} r={14}/></div>}
      {o&&<>
        <div className="orderHead"><div><span className="label">Номер заказа</span><button className="orderId" onClick={copy} title="Скопировать">{o.public_id}<Copy size={15}/></button></div><StatusBadge status={o.status}/></div>
        <div className="orderLines">{o.items.map((i,k)=><div key={k}><span className="lineIcon">{i.delivery_type==='gift_card'?<Gift size={16}/>:<ListChecks size={16}/>}</span><span className="grow"><b>{i.title}</b><small>{i.variant} × {i.quantity}</small></span><b>{money(Number(i.unit_price)*i.quantity)}</b></div>)}</div>
        <div className="totals compact">
          {Number(o.promo_discount_amount)>0&&<div className="minus"><span>Промокод {o.promo_code}</span><b>−{money(o.promo_discount_amount)}</b></div>}
          {Number(o.bonus_spent_amount)>0&&<div className="minus"><span>Бонусы</span><b>−{money(o.bonus_spent_amount)}</b></div>}
          <div className="grand"><span>К оплате</span><b>{money(o.total_amount)}</b></div>
        </div>
        {isGift&&<div className="noteBox"><KeyRound size={16}/><span>Код будет доступен только вам — в разделе «Заказы» личного кабинета.</span></div>}
      </>}
      <div className="successActions"><Link className="btn primary lg" to="/account?tab=orders">Перейти к заказам</Link><Link className="btn ghost lg" to={isGift?'/gift-cards':'/catalog'}>{isGift?'Ещё подарочные карты':'Другие услуги'}</Link></div>
    </div>
  </div>
}
