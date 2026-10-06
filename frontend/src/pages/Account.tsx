import {FormEvent,useEffect,useMemo,useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {ArrowDownLeft,ArrowRight,ArrowUpRight,BriefcaseBusiness,ChevronDown,Copy,Gift,KeyRound,LayoutDashboard,LogOut,PackageCheck,PackageOpen,RotateCcw,Save,UserRound,WalletCards} from 'lucide-react'
import {api,session} from '../api'
import type {BonusTransaction,Order,User} from '../types'
import {useDocumentTitle,useUser} from '../hooks'
import {EmptyState,Skeleton,StatusBadge,useToast} from '../components/ui'
import {dateShort,dateTime,money,plural} from '../lib/format'
import {errorText} from '../lib/errors'
import PayButton from '../components/PayButton'

type Tab='overview'|'orders'|'bonuses'|'profile'
const TABS:{id:Tab;label:string;icon:typeof UserRound}[]=[
  {id:'overview',label:'Обзор',icon:LayoutDashboard},
  {id:'orders',label:'Заказы',icon:PackageCheck},
  {id:'bonuses',label:'Бонусы',icon:WalletCards},
  {id:'profile',label:'Профиль',icon:UserRound},
]
const ACTIVE=['awaiting_payment','paid','in_progress']
const isGiftOrder=(o:Order)=>o.items.length>0&&o.items.every(i=>i.delivery_type==='gift_card')

export default function Account(){
  useDocumentTitle('Личный кабинет')
  const nav=useNavigate()
  const[params,setParams]=useSearchParams()
  const tab=(TABS.some(t=>t.id===params.get('tab'))?params.get('tab'):'overview') as Tab
  const{user}=useUser()
  const[orders,setOrders]=useState<Order[]|null>(null)
  const[bonuses,setBonuses]=useState<BonusTransaction[]|null>(null)
  const[error,setError]=useState('')
  useEffect(()=>{
    if(!session.token()){nav('/login?next=%2Faccount',{replace:true});return}
    api.me().then(session.saveUser).catch(()=>{})
    api.orders().then(setOrders).catch(e=>setError(e.message))
    api.bonusHistory().then(setBonuses).catch(()=>setBonuses([]))
  },[nav])
  useEffect(()=>{if(!user&&!session.token())nav('/login?next=%2Faccount',{replace:true})},[user,nav])
  if(!user)return null
  const go=(t:Tab)=>setParams(t==='overview'?{}:{tab:t})
  function logout(){session.logout();nav('/')}
  return <div className="container page">
    <div className="accountShell">
      <aside className="accountSide">
        <div className="accountUser"><span className="avatar xl">{(user.full_name||user.email).slice(0,1).toUpperCase()}</span><div><b>{user.full_name||'Клиент'}</b><span>{user.email}</span></div></div>
        <nav className="accountNav">{TABS.map(t=><button key={t.id} className={tab===t.id?'active':''} onClick={()=>go(t.id)}><t.icon size={18}/>{t.label}{t.id==='orders'&&orders&&orders.length>0&&<small>{orders.length}</small>}</button>)}</nav>
        <button className="accountLogout" onClick={logout}><LogOut size={18}/>Выйти</button>
      </aside>
      <section className="accountMain fadeIn" key={tab}>
        {error&&<div className="formError">{error}</div>}
        {tab==='overview'&&<Overview user={user} orders={orders} go={go}/>}
        {tab==='orders'&&<Orders orders={orders}/>}
        {tab==='bonuses'&&<Bonuses user={user} items={bonuses}/>}
        {tab==='profile'&&<Profile user={user} onLogout={logout}/>}
      </section>
    </div>
  </div>
}

function Overview({user,orders,go}:{user:User;orders:Order[]|null;go:(t:Tab)=>void}){
  const active=orders?.filter(o=>ACTIVE.includes(o.status)).length??0
  const done=orders?.filter(o=>o.status==='completed').length??0
  const hour=new Date().getHours()
  const hello=hour<5?'Доброй ночи':hour<12?'Доброе утро':hour<18?'Добрый день':'Добрый вечер'
  return <>
    <div className="accountHero">
      <div><span className="eyebrow">ЛИЧНЫЙ КАБИНЕТ</span><h1>{hello}, {user.full_name?.split(' ')[0]||'клиент'}!</h1><p>Здесь ваши заказы, коды подарочных карт и бонусы.</p></div>
      <div className="heroQuick"><Link className="btn white" to="/catalog"><BriefcaseBusiness size={17}/>Заказать услугу</Link><Link className="btn glass" to="/gift-cards"><Gift size={17}/>Подарочные карты</Link></div>
    </div>
    <div className="statGrid">
      <button className="statCard" onClick={()=>go('orders')}><span>Всего заказов</span><b>{orders?orders.length:'—'}</b><small>за всё время</small></button>
      <button className="statCard" onClick={()=>go('orders')}><span>Активные</span><b>{orders?active:'—'}</b><small>ожидают оплаты или в работе</small></button>
      <button className="statCard" onClick={()=>go('orders')}><span>Выполнено</span><b>{orders?done:'—'}</b><small>завершённых заказов</small></button>
      <button className="statCard accent" onClick={()=>go('bonuses')}><span>Бонусный баланс</span><b>{money(user.bonus_balance)}</b><small>1 бонус = 1 ₽ при оплате</small></button>
    </div>
    <div className="sectionHead compact"><h2>Последние заказы</h2>{orders&&orders.length>0&&<button className="link" onClick={()=>go('orders')}>Все заказы<ArrowRight size={16}/></button>}</div>
    {!orders?<div className="stack">{[0,1].map(i=><Skeleton key={i} h={84} r={18}/>)}</div>
    :orders.length?<div className="stack">{orders.slice(0,3).map(o=><OrderCard key={o.public_id} o={o}/>)}</div>
    :<NoOrders/>}
  </>
}

const NoOrders=()=><EmptyState icon={<PackageOpen/>} title="Заказов пока нет" text="Оформите первую услугу или подарочную карту — заказ сразу появится здесь."><Link className="btn primary" to="/catalog"><BriefcaseBusiness size={17}/>Услуги</Link><Link className="btn gift" to="/gift-cards"><Gift size={17}/>Подарочные карты</Link></EmptyState>

const FILTERS={all:'Все',active:'Активные',completed:'Выполненные',closed:'Отменённые'} as const
function Orders({orders}:{orders:Order[]|null}){
  const[f,setF]=useState<keyof typeof FILTERS>('all')
  const[kind,setKind]=useState<'all'|'services'|'gifts'>('all')
  const list=useMemo(()=>(orders||[]).filter(o=>
    (f==='all'||f==='active'&&ACTIVE.includes(o.status)||f==='completed'&&o.status==='completed'||f==='closed'&&['cancelled','refunded'].includes(o.status))&&
    (kind==='all'||kind==='gifts'&&isGiftOrder(o)||kind==='services'&&!isGiftOrder(o))),[orders,f,kind])
  return <>
    <div className="sectionHead compact"><div><h2>Мои заказы</h2><p className="muted">{orders?`${orders.length} ${plural(orders.length,['заказ','заказа','заказов'])}`:'Загружаем…'}</p></div></div>
    <div className="toolbar wrap">
      <div className="chipsScroll">{Object.entries(FILTERS).map(([k,v])=><button key={k} className={`chip${f===k?' active':''}`} onClick={()=>setF(k as keyof typeof FILTERS)}>{v}</button>)}</div>
      <div className="segmented"><button className={kind==='all'?'active':''} onClick={()=>setKind('all')}>Все</button><button className={kind==='services'?'active':''} onClick={()=>setKind('services')}><BriefcaseBusiness size={15}/>Услуги</button><button className={kind==='gifts'?'active':''} onClick={()=>setKind('gifts')}><Gift size={15}/>Карты</button></div>
    </div>
    {!orders?<div className="stack">{[0,1,2].map(i=><Skeleton key={i} h={84} r={18}/>)}</div>
    :!orders.length?<NoOrders/>
    :list.length?<div className="stack">{list.map(o=><OrderCard key={o.public_id} o={o}/>)}</div>
    :<EmptyState icon={<PackageOpen/>} title="Нет заказов с такими параметрами"><button className="btn ghost" onClick={()=>{setF('all');setKind('all')}}><RotateCcw size={16}/>Сбросить фильтр</button></EmptyState>}
  </>
}

function OrderCard({o}:{o:Order}){
  const[open,setOpen]=useState(false)
  const toast=useToast()
  const gift=isGiftOrder(o)
  const count=o.items.reduce((s,i)=>s+i.quantity,0)
  const copy=(text:string,label:string)=>navigator.clipboard?.writeText(text).then(()=>toast({title:`${label} скопирован`}))
  return <article className={`orderCard${open?' open':''}`}>
    <button className="orderTop" onClick={()=>setOpen(v=>!v)} aria-expanded={open}>
      <span className={`orderKind ${gift?'gifts':'services'}`}>{gift?<Gift size={20}/>:<BriefcaseBusiness size={20}/>}</span>
      <span className="orderMain"><b>{o.items.length===1?o.items[0].title:`${o.items[0]?.title} и ещё ${o.items.length-1}`}</b><small>{o.public_id} · {dateTime(o.created_at)} · {count} шт.</small></span>
      <StatusBadge status={o.status}/>
      <b className="orderSum">{money(o.total_amount)}</b>
      <ChevronDown size={18} className="chev"/>
    </button>
    <div className="orderBody"><div>
      <div className="orderLines">{o.items.map((i,k)=><div key={k}><span className="grow">{i.product_slug?<Link to={`/product/${i.product_slug}`}><b>{i.title}</b></Link>:<b>{i.title}</b>}<small>{i.variant} × {i.quantity}</small></span><b>{money(Number(i.unit_price)*i.quantity)}</b></div>)}</div>
      <div className="totals compact">
        <div><span>Стоимость</span><b>{money(o.subtotal_amount)}</b></div>
        {Number(o.promo_discount_amount)>0&&<div className="minus"><span>Промокод {o.promo_code}</span><b>−{money(o.promo_discount_amount)}</b></div>}
        {Number(o.bonus_spent_amount)>0&&<div className="minus"><span>Бонусы</span><b>−{money(o.bonus_spent_amount)}</b></div>}
        <div className="grand"><span>Итого</span><b>{money(o.total_amount)}</b></div>
      </div>
      {o.delivery_token
        ?<div className="tokenBox"><KeyRound size={18}/><div><small>{gift?'Код выдачи':'Код заявки'}</small><code>{o.delivery_token}</code></div><button className="iconBtn" onClick={()=>copy(o.delivery_token!,'Код')} aria-label="Скопировать код"><Copy size={16}/></button></div>
        :o.status==='awaiting_payment'&&<div className="payRow"><div className="noteBox"><KeyRound size={16}/><span>{gift?'Код появится здесь после подтверждения оплаты.':'Приступим к работе после подтверждения оплаты.'}</span></div><PayButton publicId={o.public_id} amount={o.total_amount}/></div>}
      <div className="orderActions"><button className="textBtn" onClick={()=>copy(o.public_id,'Номер заказа')}><Copy size={14}/>Скопировать номер</button>{Number(o.bonus_earned_amount)>0&&<span className="muted">{['paid','in_progress','completed'].includes(o.status)?'Начислено':'Будет начислено'} {money(o.bonus_earned_amount)} бонусами</span>}</div>
    </div></div>
  </article>
}

function Bonuses({user,items}:{user:User;items:BonusTransaction[]|null}){
  return <>
    <div className="bonusHero"><div><span>Бонусный баланс</span><b>{money(user.bonus_balance)}</b><small>1 бонус = 1 ₽. Списывайте при оформлении любого заказа.</small></div><WalletCards size={64} strokeWidth={1.2}/></div>
    <div className="infoGrid three">
      <div><span className="infoIcon"><ArrowDownLeft size={20}/></span><b>Начисление</b><p>2% от суммы заказа после подтверждения оплаты.</p></div>
      <div><span className="infoIcon"><ArrowUpRight size={20}/></span><b>Списание</b><p>Включите «Списать бонусы» в корзине или при оформлении заявки.</p></div>
      <div><span className="infoIcon"><RotateCcw size={20}/></span><b>Возврат</b><p>При отмене заказа списанные бонусы возвращаются на баланс.</p></div>
    </div>
    <div className="sectionHead compact"><h2>История операций</h2></div>
    {!items?<div className="stack">{[0,1,2].map(i=><Skeleton key={i} h={64} r={14}/>)}</div>
    :items.length?<div className="txList">{items.map(t=>{const plus=Number(t.amount)>0;return <div key={t.id}><span className={`txIcon ${plus?'plus':'minus'}`}>{plus?<ArrowDownLeft size={18}/>:<ArrowUpRight size={18}/>}</span><span className="grow"><b>{t.description}</b><small>{dateTime(t.created_at)}</small></span><b className={plus?'plus':'minus'}>{plus?'+':'−'}{money(Math.abs(Number(t.amount)))}</b></div>})}</div>
    :<EmptyState icon={<WalletCards/>} title="Операций пока нет" text="Бонусы начисляются после оплаты заказа — 2% от суммы."/>}
  </>
}

function Profile({user,onLogout}:{user:User;onLogout:()=>void}){
  const toast=useToast()
  const[name,setName]=useState(user.full_name||'')
  const[phone,setPhone]=useState(user.phone||'')
  const[busy,setBusy]=useState(false);const[err,setErr]=useState('')
  const[cur,setCur]=useState('');const[pwd,setPwd]=useState('');const[pwdBusy,setPwdBusy]=useState(false);const[pwdErr,setPwdErr]=useState('')
  const changed=name.trim()!==(user.full_name||'')||phone.trim()!==(user.phone||'')
  async function save(e:FormEvent){
    e.preventDefault();setBusy(true);setErr('')
    try{session.saveUser(await api.updateMe({full_name:name.trim(),phone:phone.trim()||null}));toast({title:'Профиль сохранён'})}
    catch(x){setErr(errorText(x))}finally{setBusy(false)}
  }
  async function changePwd(e:FormEvent){
    e.preventDefault();setPwdBusy(true);setPwdErr('')
    try{await api.changePassword(cur,pwd);setCur('');setPwd('');toast({title:'Пароль изменён'})}
    catch(x){setPwdErr(errorText(x))}finally{setPwdBusy(false)}
  }
  return <>
    <div className="sectionHead compact"><div><h2>Профиль</h2><p className="muted">Аккаунт создан {dateShort(user.created_at)}</p></div></div>
    <div className="profileGrid">
      <form className="panel" onSubmit={save}>
        <h3>Личные данные</h3>
        <label className="field"><span>Имя и фамилия</span><input required minLength={2} value={name} onChange={e=>setName(e.target.value)}/></label>
        <label className="field"><span>Телефон <em>необязательно</em></span><input type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 900 000-00-00"/></label>
        <label className="field"><span>E-mail</span><input value={user.email} disabled/><small>E-mail используется для входа и не меняется.</small></label>
        {err&&<div className="formError">{err}</div>}
        <button className="btn primary" disabled={busy||!changed}><Save size={17}/>{busy?'Сохраняем…':'Сохранить'}</button>
      </form>
      <form className="panel" onSubmit={changePwd}>
        <h3>Смена пароля</h3>
        <label className="field"><span>Текущий пароль</span><input type="password" required autoComplete="current-password" value={cur} onChange={e=>setCur(e.target.value)}/></label>
        <label className="field"><span>Новый пароль</span><input type="password" required minLength={8} autoComplete="new-password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="Не менее 8 символов"/></label>
        {pwdErr&&<div className="formError">{pwdErr}</div>}
        <button className="btn ghost" disabled={pwdBusy||!cur||pwd.length<8}><KeyRound size={17}/>{pwdBusy?'Меняем…':'Изменить пароль'}</button>
      </form>
    </div>
    <button className="btn ghost danger" onClick={onLogout}><LogOut size={17}/>Выйти из аккаунта</button>
  </>
}
