import {FormEvent,useEffect,useState} from 'react'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {ArrowRight,Eye,EyeOff,Gift,LockKeyhole,PackageCheck,ShieldCheck,WalletCards} from 'lucide-react'
import {api,session} from '../api'
import {useSite} from '../site'
import {useDocumentTitle} from '../hooks'
import {useToast} from '../components/ui'
import {errorText} from '../lib/errors'

export default function Login(){
  const nav=useNavigate()
  const site=useSite()
  const toast=useToast()
  const[params]=useSearchParams()
  const rawNext=params.get('next')||'/account'
  const next=rawNext.startsWith('/')&&!rawNext.startsWith('//')?rawNext:'/account'
  const[mode,setMode]=useState<'login'|'register'>(params.get('mode')==='register'?'register':'login')
  const[error,setError]=useState('');const[busy,setBusy]=useState(false);const[show,setShow]=useState(false)
  const[email,setEmail]=useState('');const[password,setPassword]=useState('');const[name,setName]=useState('');const[phone,setPhone]=useState('')
  useDocumentTitle(mode==='login'?'Вход':'Регистрация')
  useEffect(()=>{if(session.token())nav(next,{replace:true})},[])
  async function submit(e:FormEvent){
    e.preventDefault();setError('');setBusy(true)
    try{
      const data=mode==='login'?await api.login(email.trim(),password):await api.register({full_name:name.trim(),email:email.trim(),password,phone:phone.trim()||undefined})
      session.save(data)
      toast({title:mode==='login'?`С возвращением, ${data.user.full_name?.split(' ')[0]||'клиент'}!`:'Аккаунт создан',text:mode==='register'?'Теперь можно оформлять заказы и копить бонусы.':undefined})
      nav(next,{replace:true})
    }catch(err){setError(errorText(err,'Не удалось выполнить запрос'))}
    finally{setBusy(false)}
  }
  const reason=next.startsWith('/gift-cart')||next.startsWith('/checkout')?'Войдите, чтобы завершить оформление — содержимое корзины сохранится.':null
  return <div className="container page authWrap">
    <section className="authIntro">
      <span className="eyebrow">ЛИЧНЫЙ КАБИНЕТ {site.brand_short.toUpperCase()}</span>
      <h1>Все заказы, коды и бонусы — в одном месте</h1>
      <p>Один аккаунт для обеих витрин: заявок на услуги и подарочных карт.</p>
      <ul className="authBenefits">
        <li><span><PackageCheck size={20}/></span><div><b>Статусы заказов</b><small>Номер, сумма и этап исполнения каждого заказа</small></div></li>
        <li><span><Gift size={20}/></span><div><b>Коды подарочных карт</b><small>Появляются в заказе после подтверждения оплаты</small></div></li>
        <li><span><WalletCards size={20}/></span><div><b>Бонусы 2%</b><small>Начисляем за оплаченные заказы и списываем при оформлении</small></div></li>
        <li><span><ShieldCheck size={20}/></span><div><b>Безопасность</b><small>Пароль хранится только в виде защищённого хэша</small></div></li>
      </ul>
    </section>
    <form className="authCard" onSubmit={submit} noValidate={false}>
      <div className="segmented block" role="tablist">
        <button type="button" role="tab" aria-selected={mode==='login'} className={mode==='login'?'active':''} onClick={()=>{setMode('login');setError('')}}>Вход</button>
        <button type="button" role="tab" aria-selected={mode==='register'} className={mode==='register'?'active':''} onClick={()=>{setMode('register');setError('')}}>Регистрация</button>
      </div>
      <div><h2>{mode==='login'?'С возвращением':'Создать аккаунт'}</h2><p className="muted">{reason||(mode==='login'?'Введите e-mail и пароль, указанные при регистрации.':'Регистрация займёт меньше минуты.')}</p></div>
      {mode==='register'&&<>
        <label className="field"><span>Имя и фамилия</span><input required minLength={2} autoComplete="name" value={name} onChange={e=>setName(e.target.value)} placeholder="Иван Петров"/></label>
        <label className="field"><span>Телефон <em>необязательно</em></span><input type="tel" autoComplete="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+7 900 000-00-00"/></label>
      </>}
      <label className="field"><span>E-mail</span><input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.ru"/></label>
      <label className="field"><span>Пароль</span><div className="pwd"><input type={show?'text':'password'} required minLength={8} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder={mode==='register'?'Не менее 8 символов':'Ваш пароль'}/><button type="button" onClick={()=>setShow(s=>!s)} aria-label={show?'Скрыть пароль':'Показать пароль'}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>
      {error&&<div className="formError" role="alert">{error}</div>}
      <button className="btn primary lg block" disabled={busy}>{busy?'Подождите…':<>{mode==='login'?'Войти':'Зарегистрироваться'}<ArrowRight size={18}/></>}</button>
      <p className="fine center"><LockKeyhole size={13}/>Продолжая, вы соглашаетесь с <Link to="/offer">офертой</Link> и <Link to="/privacy">политикой конфиденциальности</Link>.</p>
    </form>
  </div>
}
