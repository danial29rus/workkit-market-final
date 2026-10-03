import {Link} from 'react-router-dom'
import {BriefcaseBusiness,Compass,Gift} from 'lucide-react'
import {EmptyState} from '../components/ui'
import {useDocumentTitle} from '../hooks'

export default function NotFound(){
  useDocumentTitle('Страница не найдена')
  return <div className="container page"><EmptyState icon={<Compass/>} title="Страница не найдена" text="Возможно, ссылка устарела. Начните с одного из разделов:"><Link className="btn primary" to="/catalog"><BriefcaseBusiness size={17}/>Услуги</Link><Link className="btn gift" to="/gift-cards"><Gift size={17}/>Подарочные карты</Link></EmptyState></div>
}
