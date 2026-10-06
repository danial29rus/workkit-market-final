import {Copy,KeyRound,Loader2} from 'lucide-react'
import type {Order} from '../types'
import {useToast} from './ui'

const PAID=['paid','in_progress','completed']

/** Delivered gift-card codes of an order, or a "being issued" note while the supplier works on them. */
export default function GiftCodes({order}:{order:Order}){
  const toast=useToast()
  const gifts=order.items.filter(i=>i.delivery_type==='gift_card')
  if(!gifts.length||!PAID.includes(order.status))return null
  const copy=(code:string)=>navigator.clipboard?.writeText(code).then(()=>toast({title:'Код скопирован'}))
  return <div className="giftCodes">
    {gifts.map((item,k)=>item.codes&&item.codes.length
      ?<div className="codeGroup" key={k}>
        <span className="codeGroupTitle"><KeyRound size={16}/>{item.title} · {item.variant}</span>
        {item.codes.map(code=><div className="codeRow" key={code}><code>{code}</code><button className="iconBtn" onClick={()=>copy(code)} aria-label="Скопировать код"><Copy size={16}/></button></div>)}
      </div>
      :<div className="codePending" key={k}><Loader2 size={16} className="spin"/><span><b>{item.title} · {item.variant}</b> — выдаём код. Обычно это занимает до 15 минут, код появится здесь и придёт на почту.</span></div>)}
    {gifts.some(i=>i.codes?.length)&&<p className="fine">Перед активацией проверьте регион аккаунта — активированный код вернуть нельзя.</p>}
  </div>
}
