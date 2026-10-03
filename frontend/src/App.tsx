import {useEffect} from 'react'
import {Routes,Route,useLocation} from 'react-router-dom'
import Header from './components/Header'; import Footer from './components/Footer'; import MobileTabs from './components/MobileTabs'
import Home from './pages/Home'; import Catalog from './pages/Catalog'; import GiftCards from './pages/GiftCards'; import GiftCart from './pages/GiftCart'; import ProductPage from './pages/ProductPage'; import Checkout from './pages/Checkout'; import Success from './pages/Success'; import Account from './pages/Account'; import Offer from './pages/Offer'; import Admin from './pages/Admin'; import Login from './pages/Login'; import Privacy from './pages/Privacy'; import Contacts from './pages/Contacts'; import NotFound from './pages/NotFound'
import {SiteProvider} from './site'
import {ToastProvider} from './components/ui'
export default function App(){
  const location=useLocation()
  const admin=location.pathname.startsWith('/admin')
  useEffect(()=>{window.scrollTo({top:0})},[location.pathname])
  return <SiteProvider><ToastProvider><div className={`app${admin?' isAdmin':''}`}>{!admin&&<Header/>}<main><div className="pageTransition" key={location.pathname}><Routes location={location}><Route path="/" element={<Home/>}/><Route path="/catalog" element={<Catalog/>}/><Route path="/gift-cards" element={<GiftCards/>}/><Route path="/gift-cart" element={<GiftCart/>}/><Route path="/product/:slug" element={<ProductPage/>}/><Route path="/checkout/:variantId" element={<Checkout/>}/><Route path="/success" element={<Success/>}/><Route path="/login" element={<Login/>}/><Route path="/account" element={<Account/>}/><Route path="/offer" element={<Offer/>}/><Route path="/privacy" element={<Privacy/>}/><Route path="/contacts" element={<Contacts/>}/><Route path="/admin" element={<Admin/>}/><Route path="*" element={<NotFound/>}/></Routes></div></main>{!admin&&<Footer/>}{!admin&&<MobileTabs/>}</div></ToastProvider></SiteProvider>
}
