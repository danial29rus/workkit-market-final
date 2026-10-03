import {useEffect} from 'react'
import {Link,useLocation} from 'react-router-dom'
import {ArrowRight,BadgePercent,BriefcaseBusiness,Check,ClipboardCheck,Gift,LifeBuoy,LockKeyhole,ShoppingBag,Sparkles,UserRound,WalletCards,Zap} from 'lucide-react'
import ProductCard,{CardSkeleton,GiftBrandCard} from '../components/ProductCard'
import BudgetCalculator from '../components/BudgetCalculator'
import {GiftArt,Reveal} from '../components/ui'
import {useSite} from '../site'
import {useDocumentTitle,useProducts} from '../hooks'
import {GIFT_CATEGORY} from '../lib/format'

export default function Home(){
  const site=useSite()
  const{products,loading}=useProducts()
  const location=useLocation()
  useDocumentTitle('')
  useEffect(()=>{if(location.hash==='#calculator')setTimeout(()=>document.getElementById('calculator')?.scrollIntoView({behavior:'smooth'}),200)},[location.hash])
  const services=products.filter(p=>p.category_slug!==GIFT_CATEGORY)
  const gifts=products.filter(p=>p.category_slug===GIFT_CATEGORY)
  const brandNames=gifts.slice(0,6).map(g=>g.title)
  return <>
    <section className="hero">
      <div className="heroGlow" aria-hidden="true"/>
      <div className="container heroGrid">
        <div className="heroCopy">
          <span className="eyebrow"><Sparkles size={14}/>{site.hero_eyebrow}</span>
          <h1>{site.hero_title}</h1>
          <p>{site.hero_text}</p>
          <div className="heroActions">
            <Link className="btn primary lg" to="/catalog">{site.hero_cta}<ArrowRight size={18}/></Link>
            <Link className="btn ghost lg" to="/gift-cards"><Gift size={18}/>Подарочные карты</Link>
          </div>
          <ul className="heroPoints"><li><Check size={16}/>Фиксированные цены</li><li><Check size={16}/>Статус заказа в кабинете</li><li><Check size={16}/>2% бонусами с заказа</li></ul>
        </div>
        <div className="heroVisual" aria-hidden="true">
          <div className="hvOrder">
            <div className="hvHead"><span className="hvIcon"><BriefcaseBusiness size={18}/></span><div><b>Настройка финмодели</b><small>Заказ WK-7F21C0 · пакет «Бизнес»</small></div><span className="status s-in_progress"><i/>В работе</span></div>
            <ol className="hvSteps"><li className="done">Оформлен</li><li className="done">Оплачен</li><li className="now">В работе</li><li>Готово</li></ol>
            <div className="hvBar"><span/></div>
          </div>
          <div className="hvCards">
            <GiftArt title={brandNames[1]||'Steam'} size="sm"/>
            <GiftArt title={brandNames[0]||'Apple Gift Card'} size="sm"/>
          </div>
          <div className="hvBonus"><WalletCards size={18}/><div><b>+ 48,20 ₽</b><small>бонусов за заказ</small></div></div>
        </div>
      </div>
    </section>

    <section className="container section">
      <Reveal className="sectionHead center">
        <span className="eyebrow">ДВА НАПРАВЛЕНИЯ — ОДИН АККАУНТ</span>
        <h2>Выберите, что вам нужно</h2>
        <p>Услуги и подарочные карты оформляются по-разному, поэтому у каждого направления своя витрина. Общие — только личный кабинет, история заказов и бонусы.</p>
      </Reveal>
      <div className="directions">
        <Reveal as="article" className="directionCard services">
          <div className="dcTop"><span className="dcIcon"><BriefcaseBusiness size={26}/></span><span className="dcKicker">Заявка → исполнение</span></div>
          <h3>Услуги для бизнеса</h3>
          <p>Готовые пакеты работ с фиксированной ценой: таблицы, контент, дизайн, структура проекта. Исполнение по этапам, статус и результат — в кабинете.</p>
          <ul><li><ClipboardCheck size={16}/>Состав работ и сроки заранее</li><li><UserRound size={16}/>Детали уточняем после заявки</li><li><BadgePercent size={16}/>Промокоды и бонусы</li></ul>
          <div className="dcFoot"><Link className="btn primary" to="/catalog">Каталог услуг<ArrowRight size={17}/></Link><span>{services.length||'8'} {services.length===1?'предложение':'предложений'}</span></div>
        </Reveal>
        <Reveal as="article" className="directionCard gifts" delay={90}>
          <div className="dcTop"><span className="dcIcon"><Gift size={26}/></span><span className="dcKicker">Корзина → цифровой код</span></div>
          <h3>Подарочные карты</h3>
          <p>Коды пополнения для Steam, PlayStation, Apple, Google Play и других сервисов. Соберите разные номиналы в одну корзину и оплатите одним заказом.</p>
          <ul><li><Zap size={16}/>Выдача кода обычно до 15 минут</li><li><ShoppingBag size={16}/>Несколько карт в одном заказе</li><li><LockKeyhole size={16}/>Код виден только вам в кабинете</li></ul>
          <div className="dcFoot"><Link className="btn gift" to="/gift-cards">Выбрать карту<ArrowRight size={17}/></Link><span>{gifts.length||'6'} сервисов</span></div>
        </Reveal>
      </div>
    </section>

    <section className="container section">
      <Reveal className="sectionHead"><div><span className="eyebrow"><BriefcaseBusiness size={14}/>УСЛУГИ ДЛЯ БИЗНЕСА</span><h2>Популярные пакеты</h2></div><Link className="link" to="/catalog">Все услуги<ArrowRight size={16}/></Link></Reveal>
      <div className="productGrid">{loading?Array.from({length:4},(_,i)=><CardSkeleton key={i}/>):services.slice(0,4).map((x,i)=><Reveal key={x.id} delay={i*60}><ProductCard p={x}/></Reveal>)}</div>
    </section>

    <div id="calculator"><BudgetCalculator/></div>

    <section className="giftBand">
      <div className="container section">
        <Reveal className="sectionHead"><div><span className="eyebrow light"><Gift size={14}/>ПОДАРОЧНЫЕ КАРТЫ</span><h2>Пополнение любимых сервисов</h2><p>Цена номинала с комиссией видна сразу — без сюрпризов при оформлении.</p></div><Link className="link light" to="/gift-cards">Все карты<ArrowRight size={16}/></Link></Reveal>
        <div className="giftGrid">{loading?Array.from({length:3},(_,i)=><CardSkeleton key={i} gift/>):gifts.slice(0,6).map((x,i)=><Reveal key={x.id} delay={i*50}><GiftBrandCard p={x}/></Reveal>)}</div>
      </div>
    </section>

    <section className="container section">
      <Reveal className="sectionHead center"><span className="eyebrow">КАК ЭТО РАБОТАЕТ</span><h2>Прозрачно на каждом шаге</h2></Reveal>
      <div className="steps">
        {[['01','Выберите','Пакет услуги или номинал карты — цена видна сразу, с учётом всех комиссий.'],['02','Оформите','Заказ получает номер и сразу появляется в личном кабинете. Промокод и бонусы — при оформлении.'],['03','Получите результат','Статус меняется по мере исполнения, а цифровые коды выдаются в кабинете после оплаты.']].map(([n,t,d],i)=><Reveal key={n} className="step" delay={i*80}><span>{n}</span><b>{t}</b><p>{d}</p></Reveal>)}
      </div>
    </section>

    <section className="container section tight">
      <Reveal className="ctaBand">
        <div><h2>{site.promo_title}</h2><p>{site.promo_text}</p></div>
        <div className="ctaActions"><Link className="btn white lg" to="/contacts">Задать вопрос<ArrowRight size={18}/></Link><span><LifeBuoy size={16}/>{site.work_hours}</span></div>
      </Reveal>
    </section>
  </>
}
