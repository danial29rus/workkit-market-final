import {useEffect,useState} from 'react'
import {Link,NavLink,useLocation} from 'react-router-dom'
import {BriefcaseBusiness,Gift,Search,ShoppingBag,UserRound,X} from 'lucide-react'
import {useSite} from '../site'
import {useArea,useGiftCart,useUser} from '../hooks'
import SearchBox from './SearchBox'

export default function Header(){
  const site=useSite()
  const{user}=useUser()
  const{count}=useGiftCart()
  const location=useLocation()
  const area=useArea()
  const[scrolled,setScrolled]=useState(false)
  const[searchOpen,setSearchOpen]=useState(false)
  const[bump,setBump]=useState(false)
  useEffect(()=>{const h=()=>setScrolled(window.scrollY>8);h();window.addEventListener('scroll',h,{passive:true});return()=>window.removeEventListener('scroll',h)},[])
  useEffect(()=>{setSearchOpen(false)},[location.pathname,location.search])
  useEffect(()=>{if(!count)return;setBump(true);const t=setTimeout(()=>setBump(false),450);return()=>clearTimeout(t)},[count])
  useEffect(()=>{document.body.classList.toggle('navLock',searchOpen);return()=>document.body.classList.remove('navLock')},[searchOpen])
  const itemPage=/^\/(product|checkout)\//.test(location.pathname)
  const giftArea=location.pathname.startsWith('/gift')||itemPage&&area==='gifts'
  const serviceArea=location.pathname.startsWith('/catalog')||itemPage&&area==='services'
  const firstName=user?.full_name?.split(' ')[0]||'Кабинет'
  return <>
    <header className={`siteHeader${scrolled?' scrolled':''}`}>
      <div className="container headerRow">
        <Link className="brand" to="/" aria-label={site.brand_name}><span className="mark">{site.brand_mark}</span><span className="brandName">{site.brand_name}</span></Link>
        <nav className="areaSwitch" aria-label="Разделы">
          <NavLink to="/catalog" className={()=>serviceArea?'active':''}><BriefcaseBusiness size={16}/>{site.catalog_label}</NavLink>
          <NavLink to="/gift-cards" className={()=>giftArea?'active gift':''}><Gift size={16}/>Подарочные карты</NavLink>
        </nav>
        <div className="headerSearch"><SearchBox/></div>
        <div className="headerActions">
          <Link className="headerLink hideMd" to="/contacts">Контакты</Link>
          <button className="iconBtn showMd" aria-label="Поиск" onClick={()=>setSearchOpen(true)}><Search size={20}/></button>
          <Link className={`iconBtn cartBtn${bump?' bump':''}`} to="/gift-cart" aria-label={`Корзина подарочных карт${count?`: ${count}`:''}`} title="Корзина подарочных карт"><ShoppingBag size={20}/>{count>0&&<b>{count>99?'99+':count}</b>}</Link>
          {user
            ?<Link className="accountBtn" to="/account"><span className="avatar">{(user.full_name||user.email).slice(0,1).toUpperCase()}</span><span className="hideSm">{firstName}</span></Link>
            :<Link className="loginBtn" to="/login"><UserRound size={18}/><span className="hideSm">Войти</span></Link>}
        </div>
      </div>
    </header>
    {searchOpen&&<div className="searchSheet" role="dialog" aria-label="Поиск">
      <div className="searchSheetTop"><SearchBox autoFocus onDone={()=>setSearchOpen(false)}/><button className="iconBtn" aria-label="Закрыть поиск" onClick={()=>setSearchOpen(false)}><X size={20}/></button></div>
      <div className="searchSheetHint"><span>Быстрые переходы</span><Link to="/catalog"><BriefcaseBusiness size={16}/>Все услуги</Link><Link to="/gift-cards"><Gift size={16}/>Все подарочные карты</Link></div>
    </div>}
  </>
}
