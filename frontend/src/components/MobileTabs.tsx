import {NavLink} from 'react-router-dom'
import {BriefcaseBusiness,Gift,House,ShoppingBag,UserRound} from 'lucide-react'
import {useGiftCart,useUser} from '../hooks'

/** App-style bottom navigation for phones. */
export default function MobileTabs(){
  const{count}=useGiftCart()
  const{user}=useUser()
  return <nav className="mobileTabs" aria-label="Основная навигация">
    <NavLink to="/" end><House size={21}/><span>Главная</span></NavLink>
    <NavLink to="/catalog"><BriefcaseBusiness size={21}/><span>Услуги</span></NavLink>
    <NavLink to="/gift-cards"><Gift size={21}/><span>Карты</span></NavLink>
    <NavLink to="/gift-cart" className="tabCart"><ShoppingBag size={21}/>{count>0&&<b>{count>99?'99+':count}</b>}<span>Корзина</span></NavLink>
    <NavLink to={user?'/account':'/login'}><UserRound size={21}/><span>{user?'Кабинет':'Войти'}</span></NavLink>
  </nav>
}
