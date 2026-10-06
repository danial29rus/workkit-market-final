import {api} from '../api'
import {ApiError} from './errors'

export const LAST_ORDER_KEY='workkit_last_order'

/**
 * Sends the customer to the Mulen Pay checkout for an order.
 * Resolves to an error message when the redirect is impossible (the order itself stays saved).
 */
export async function goToPayment(publicId:string):Promise<{redirected:boolean;error?:string}>{
  try{localStorage.setItem(LAST_ORDER_KEY,publicId)}catch{}
  try{
    const r=await api.payOrder(publicId)
    if(r.payment_url){window.location.assign(r.payment_url);return{redirected:true}}
    return{redirected:false}
  }catch(e){
    // Payments not switched on yet: the order is simply saved, which is not an error for the customer.
    if(e instanceof ApiError&&e.code==='provider_not_configured')return{redirected:false}
    return{redirected:false,error:e instanceof ApiError?e.message:'Не удалось перейти к оплате'}
  }
}
