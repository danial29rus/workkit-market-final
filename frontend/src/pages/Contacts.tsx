import {Link} from 'react-router-dom'
import {ArrowRight,Building2,Clock3,Mail,MessageCircle,Phone} from 'lucide-react'
import {useSite} from '../site'
import {useDocumentTitle} from '../hooks'
import {PageHead,Reveal} from '../components/ui'

export default function Contacts(){
  const site=useSite()
  useDocumentTitle('Контакты')
  const hasSeller=site.seller_name||site.seller_inn||site.seller_ogrn||site.seller_address
  return <div className="container page">
    <PageHead crumbs={[{label:'Главная',to:'/'},{label:'Контакты'}]} title="Контакты и поддержка" text="По вопросам заказа, оплаты, кодов подарочных карт или документов — напишите нам удобным способом."/>
    <div className="contactGrid">
      <Reveal className="contactCard"><span className="infoIcon"><Mail size={22}/></span><small>E-mail</small><a href={`mailto:${site.support_email}`}>{site.support_email}</a><p>Основной канал для заказов и документов</p></Reveal>
      {site.support_phone&&<Reveal className="contactCard" delay={60}><span className="infoIcon"><Phone size={22}/></span><small>Телефон</small><a href={`tel:${site.support_phone.replace(/[^+\d]/g,'')}`}>{site.support_phone}</a><p>Контактный номер сервиса</p></Reveal>}
      <Reveal className="contactCard" delay={120}><span className="infoIcon"><Clock3 size={22}/></span><small>Режим работы</small><b>{site.work_hours}</b><p>Отвечаем в рабочее время, обычно в течение часа</p></Reveal>
    </div>
    <div className="profileGrid">
      <Reveal className="panel"><h2><Building2 size={20}/>Реквизиты</h2>{hasSeller?<p className="lead">{site.seller_name&&<><b>{site.seller_name}</b><br/></>}{site.seller_inn&&<>ИНН: {site.seller_inn}</>}{site.seller_inn&&site.seller_ogrn&&' · '}{site.seller_ogrn&&<>ОГРН/ОГРНИП: {site.seller_ogrn}</>}{(site.seller_inn||site.seller_ogrn)&&<br/>}{site.seller_address}</p>:<p className="lead">Сервис работает в тестовом режиме: юридическое лицо/ИП для приёма платежей пока не подключено, полные реквизиты появятся здесь после регистрации. Актуальный способ связи — e-mail выше.</p>}</Reveal>
      <Reveal className="panel accentPanel" delay={80}><h2><MessageCircle size={20}/>Уже есть заказ?</h2><p className="lead">В личном кабинете — номер, сумма, текущий статус и коды подарочных карт. Укажите номер заказа в письме, чтобы мы ответили быстрее.</p><Link className="btn primary" to="/account?tab=orders">Мои заказы<ArrowRight size={17}/></Link></Reveal>
    </div>
  </div>
}
