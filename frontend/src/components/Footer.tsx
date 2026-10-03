import {Link} from 'react-router-dom'
import {Mail,Phone,Clock3} from 'lucide-react'
import {useSite} from '../site'
export default function Footer(){
  const site=useSite()
  return <footer className="siteFooter">
    <div className="container footerGrid">
      <div className="footerBrand">
        <Link className="brand light" to="/"><span className="mark">{site.brand_mark}</span><span className="brandName">{site.brand_name}</span></Link>
        <p>{site.tagline}. Услуги для бизнеса и цифровые подарочные карты — в одном аккаунте, с общей историей заказов и бонусами.</p>
      </div>
      <div><b>Услуги</b><Link to="/catalog">Каталог услуг</Link><Link to="/#calculator">Калькулятор бюджета</Link><Link to="/contacts">Индивидуальная задача</Link></div>
      <div><b>Подарочные карты</b><Link to="/gift-cards">Все сервисы</Link><Link to="/gift-cart">Корзина</Link><Link to="/account?tab=bonuses">Бонусы</Link></div>
      <div><b>Документы</b><Link to="/offer">Публичная оферта</Link><Link to="/privacy">Политика конфиденциальности</Link><Link to="/contacts">Реквизиты</Link></div>
      <div className="footerContacts"><b>Поддержка</b><a href={`mailto:${site.support_email}`}><Mail size={15}/>{site.support_email}</a>{site.support_phone&&<a href={`tel:${site.support_phone.replace(/[^+\d]/g,'')}`}><Phone size={15}/>{site.support_phone}</a>}<span><Clock3 size={15}/>{site.work_hours}</span></div>
    </div>
    <div className="container footerBottom"><span>© {new Date().getFullYear()} {site.brand_name}</span><span>Номер карты и CVV сайт не запрашивает и не хранит</span></div>
  </footer>
}
