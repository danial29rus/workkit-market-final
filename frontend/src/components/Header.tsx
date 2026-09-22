import {useEffect,useState} from 'react'
import {Link,NavLink,useNavigate} from 'react-router-dom'
import {Clock3,LogOut,Search,UserRound} from 'lucide-react'
import {session} from '../api'
import type {User} from '../types'
import {useSite} from '../site'

export default function Header(){
  const[user,setUser]=useState<User|null>(session.user())
  const[q,setQ]=useState('')
  const site=useSite()
  const nav=useNavigate()
  useEffect(()=>{const h=()=>setUser(session.user());window.addEventListener('workkit-session',h);return()=>window.removeEventListener('workkit-session',h)},[])
  function submitSearch(e:React.FormEvent){e.preventDefault();nav(`/catalog${q.trim()?`?q=${encodeURIComponent(q.trim())}`:''}`)}
  return <>
    <div className="servicebar"><div className="container servicebarInner"><span><Clock3 size={14}/> {site.work_hours}</span><span>Личный кабинет и история заказов</span><Link to="/offer">Условия работы</Link></div></div>
    <div className="topline"><div className="container topwrap"><div className="brandbig"><span className="mark">{site.brand_mark}</span><span>{site.brand_name}</span></div><div className="tagline">{site.tagline}<br/><b>Понятный результат и статус заказа в кабинете</b></div></div></div>
    <header><div className="container nav"><Link className="brand" to="/"><span className="mark small">{site.brand_mark}</span>{site.brand_short}</Link><NavLink className="catalogBtn" to="/catalog">{site.catalog_label}</NavLink><form className="search" onSubmit={submitSearch}><Search size={17}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Поиск по каталогу…"/></form><nav><Link to="/catalog">{site.catalog_label}</Link><Link to="/contacts">Контакты</Link>{user?<><Link to="/account"><UserRound size={18}/> {user.full_name?.split(' ')[0]||'Кабинет'}</Link><button className="navLogout" onClick={()=>session.logout()} title="Выйти"><LogOut size={18}/></button></>:<Link to="/login"><UserRound size={18}/> Войти</Link>}</nav></div></header>
  </>
}
