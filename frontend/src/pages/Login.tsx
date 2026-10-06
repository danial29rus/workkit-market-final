import {FormEvent,useEffect,useState} from 'react'
import type {AuthResponse} from '../types'
import CodeInput from '../components/CodeInput'
import {Link,useNavigate,useSearchParams} from 'react-router-dom'
import {ArrowLeft,ArrowRight,Eye,EyeOff,MailCheck,Gift,LockKeyhole,PackageCheck,ShieldCheck,WalletCards} from 'lucide-react'
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
  const[pending,setPending]=useState<{email:string}|null>(null)
  const[code,setCode]=useState('');const[cooldown,setCooldown]=useState(0)
  useDocumentTitle(pending?'Подтверждение e-mail':mode==='login'?'Вход':'Регистрация')
  useEffect(()=>{if(cooldown<=0)return;const t=setTimeout(()=>setCooldown(c=>c-1),1000);return()=>clearTimeout(t)},[cooldown])
  function finish(data:AuthResponse,fresh:boolean){
    session.save(data)
    toast({title:fresh?'Аккаунт создан':`С возвращением, ${data.user.full_name?.split(' ')[0]||'клиент'}!`,text:fresh?'Теперь можно оформлять заказы и копить бонусы.':undefined})
    nav(next,{replace:true})
  }
  async function verify(value=code){
    if(!pending||value.length<6)return
    setError('');setBusy(true)
    try{finish(await api.verifyEmail(pending.email,value),true)}
    catch(err){setError(errorText(err));setCode('')}
    finally{setBusy(false)}
  }
  async function resend(){
    if(!pending||cooldown>0)return
    setError('')
    try{const r=await api.resendCode(pending.email);setCooldown(r.retry_after);toast({title:'Код отправлен',text:pending.email})}
    catch(err){setError(errorText(err))}
  }
  useEffect(()=>{if(session.token())nav(next,{replace:true})},[])
  async function submit(e:FormEvent){
    e.preventDefault();setError('');setBusy(true)
    try{
      const data=mode==='login'?await api.login(email.trim(),password):await api.register({full_name:name.trim(),email:email.trim(),password,phone:phone.trim()||undefined})
      if('verification_required' in data){setPending({email:data.email});setCooldown(data.retry_after);setCode('')}
      else finish(data,mode==='register')
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
    {pending?<form className="authCard" onSubmit={e=>{e.preventDefault();verify()}}>
      <button type="button" className="textBtn backLink" onClick={()=>{setPending(null);setError('');setCode('')}}><ArrowLeft size={15}/>Назад</button>
      <div className="verifyHead"><span className="verifyIcon"><MailCheck size={26}/></span><h2>Подтвердите e-mail</h2><p className="muted">Мы отправили 6-значный код на <b>{pending.email}</b>. Введите его ниже — письмо обычно приходит за минуту.</p></div>
      <CodeInput value={code} disabled={busy} invalid={!!error} onChange={v=>{setCode(v);setError('');if(v.length===6)verify(v)}}/>
      {error&&<div className="formError" role="alert">{error}</div>}
      <button className="btn primary lg block" disabled={busy||code.length<6}>{busy?'Проверяем…':<>Подтвердить<ArrowRight size={18}/></>}</button>
      <p className="fine center">Не пришло письмо? Проверьте «Спам» или {cooldown>0?<span>запросите новый код через {cooldown} с</span>:<button type="button" className="linkBtn" onClick={resend}>отправьте код ещё раз</button>}</p>
    </form>
    :<form className="authCard" onSubmit={submit} noValidate={false}>
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
    </form>}
  </div>
}
