export type GiftCartLine={variantId:number;quantity:number}
const KEY='workkit_gift_cart'
function read():GiftCartLine[]{try{const value=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(value)?value:[]}catch{return[]}}
function write(items:GiftCartLine[]){localStorage.setItem(KEY,JSON.stringify(items));window.dispatchEvent(new Event('workkit-gift-cart'))}
export const giftCart={
  items:read,
  add(variantId:number,quantity=1){const items=read();const existing=items.find(item=>item.variantId===variantId);if(existing)existing.quantity=Math.min(20,existing.quantity+quantity);else items.push({variantId,quantity:Math.min(20,quantity)});write(items)},
  update(variantId:number,quantity:number){const items=read().map(item=>item.variantId===variantId?{...item,quantity:Math.max(1,Math.min(20,quantity))}:item);write(items)},
  remove(variantId:number){write(read().filter(item=>item.variantId!==variantId))},
  clear(){write([])},
  count:()=>read().reduce((sum,item)=>sum+item.quantity,0),
}
