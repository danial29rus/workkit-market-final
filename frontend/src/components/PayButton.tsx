import {useState} from 'react'
import {CreditCard,Loader2} from 'lucide-react'
import {goToPayment} from '../lib/payments'
import {money} from '../lib/format'

export default function PayButton({publicId,amount,className='btn primary',onError}:{publicId:string;amount?:string;className?:string;onError?:(m:string)=>void}){
  const[busy,setBusy]=useState(false)
  const[error,setError]=useState('')
  async function pay(){
    setBusy(true);setError('')
    const r=await goToPayment(publicId)
    if(!r.redirected){setBusy(false);if(r.error){setError(r.error);onError?.(r.error)}}
  }
  return <>
    <button type="button" className={className} onClick={pay} disabled={busy}>{busy?<><Loader2 size={17} className="spin"/>Переходим к оплате…</>:<><CreditCard size={17}/>Оплатить{amount?` ${money(amount)}`:''}</>}</button>
    {error&&!onError&&<div className="formError" role="alert">{error}</div>}
  </>
}
