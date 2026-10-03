import {useCallback,useEffect,useRef,useState} from 'react'
import {Link} from 'react-router-dom'
import {BadgePercent,Check,Loader2,TicketPercent,WalletCards,X} from 'lucide-react'
import type {OrderQuote,User} from '../types'
import {money} from '../lib/format'
import {ApiError} from '../lib/errors'

type QuoteFn=(promo:string|undefined,bonus:number)=>Promise<OrderQuote>

/**
 * Promo code + bonus state for a basket. Re-quotes on the server whenever the basket
 * (identified by `basketKey`) changes while a discount is active, so totals never go stale.
 */
export function usePricing(basketKey:string,quoteFn:QuoteFn,subtotal:number,user:User|null){
  const[input,setInput]=useState('')
  const[applied,setApplied]=useState<string>()
  const[useBonus,setUseBonus]=useState(false)
  const[quote,setQuote]=useState<OrderQuote|null>(null)
  const[error,setError]=useState('')
  const[loading,setLoading]=useState(false)
  const fn=useRef(quoteFn);fn.current=quoteFn
  const balance=Number(user?.bonus_balance||0)
  const bonus=useBonus&&user?balance:0 // the server caps spending at the order total

  const run=useCallback(async(code:string|undefined,b:number)=>{
    setLoading(true);setError('')
    try{const q=await fn.current(code,b);setQuote(q);return true}
    catch(e){
      const err=e as ApiError
      if(err.code?.startsWith('promo_')&&code){setApplied(undefined)}
      if(err.code==='bonus_balance_exceeded'||err.code==='authentication_required')setUseBonus(false)
      setError(err.message);return false
    }finally{setLoading(false)}
  },[])

  useEffect(()=>{
    if(!basketKey)return
    if(!applied&&!bonus){setQuote(null);return}
    const t=setTimeout(()=>{run(applied,bonus)},250)
    return()=>clearTimeout(t)
  },[basketKey,applied,bonus,run])
  useEffect(()=>{if(!user)setUseBonus(false)},[user])

  async function apply(){
    const code=input.trim().toUpperCase()
    if(!code){setError('Введите промокод.');return}
    if(code===applied)return
    if(await run(code,bonus)){setApplied(code);setInput('')}
  }
  function removePromo(){setApplied(undefined);setError('')}

  const current:OrderQuote=quote||{subtotal_amount:subtotal.toFixed(2),promo_code:null,promo_discount_amount:'0',bonus_spent_amount:'0',total_amount:subtotal.toFixed(2),bonus_earned_amount:(subtotal*.02).toFixed(2)}
  return{input,setInput,applied,apply,removePromo,useBonus,setUseBonus,balance,bonus,quote:current,error,setError,loading}
}
export type Pricing=ReturnType<typeof usePricing>

export function DiscountBox({p,user,loginNext}:{p:Pricing;user:User|null;loginNext:string}){
  return <div className="discountBox">
    {p.applied
      ?<div className="promoApplied"><TicketPercent size={18}/><div><b>{p.applied}</b><span>Промокод применён{Number(p.quote.promo_discount_amount)>0?` · −${money(p.quote.promo_discount_amount)}`:''}</span></div><button type="button" onClick={p.removePromo} aria-label="Убрать промокод"><X size={16}/></button></div>
      :<div className="promoField">
        <BadgePercent size={18}/>
        <input value={p.input} onChange={e=>{p.setInput(e.target.value.toUpperCase());p.setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();p.apply()}}} placeholder="Промокод" aria-label="Промокод" autoComplete="off" spellCheck={false}/>
        <button type="button" onClick={p.apply} disabled={p.loading||!p.input.trim()}>{p.loading?<Loader2 size={16} className="spin"/>:'Применить'}</button>
      </div>}
    {user
      ?<label className={`bonusToggle${p.balance<=0?' disabled':''}`}>
        <span className="bonusIcon"><WalletCards size={18}/></span>
        <span className="bonusText"><b>Списать бонусы</b><small>{p.balance>0?`Доступно ${money(p.balance)} · 1 бонус = 1 ₽`:'Бонусов пока нет — начислим 2% за оплаченный заказ'}</small></span>
        <input type="checkbox" className="switch" checked={p.useBonus} disabled={p.balance<=0} onChange={e=>p.setUseBonus(e.target.checked)}/>
      </label>
      :<div className="bonusGuest"><WalletCards size={18}/><span><Link to={`/login?next=${encodeURIComponent(loginNext)}`}>Войдите</Link>, чтобы копить и списывать бонусы — 2% с каждого заказа.</span></div>}
    {p.error&&<div className="formError" role="alert">{p.error}</div>}
  </div>
}

export function Totals({p,count}:{p:Pricing;count?:number}){
  const q=p.quote
  return <div className={`totals${p.loading?' updating':''}`}>
    <div><span>{count!==undefined?`Товары · ${count} шт.`:'Стоимость'}</span><b>{money(q.subtotal_amount)}</b></div>
    {Number(q.promo_discount_amount)>0&&<div className="minus"><span>Промокод {q.promo_code}</span><b>−{money(q.promo_discount_amount)}</b></div>}
    {Number(q.bonus_spent_amount)>0&&<div className="minus"><span>Бонусы</span><b>−{money(q.bonus_spent_amount)}</b></div>}
    <div className="grand"><span>К оплате</span><b key={q.total_amount} className="tick">{money(q.total_amount)}</b></div>
    <div className="earn"><Check size={14}/>Начислим {money(q.bonus_earned_amount)} бонусами после оплаты</div>
  </div>
}
