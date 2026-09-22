import {createContext,useContext,useEffect,useState} from 'react'
import type {ReactNode} from 'react'
import {api} from './api'
import type {SiteConfig} from './types'

const fallback:SiteConfig={brand_name:'WorkKit Studio',brand_short:'WorkKit',brand_mark:'W',site_mode:'services',accent_color:'#6366f1',tagline:'Цифровые услуги для бизнеса и частных задач',hero_eyebrow:'ЗАДАЧА → ПОНЯТНЫЙ РЕЗУЛЬТАТ',hero_title:'Цифровые услуги без лишней бюрократии',hero_text:'Выберите готовый пакет, создайте заявку и следите за статусом в личном кабинете.',hero_cta:'Посмотреть услуги',catalog_label:'Услуги',item_label:'услуга',order_cta:'Оформить заявку',promo_title:'Нужна нестандартная задача?',promo_text:'Выберите ближайший пакет, а детали уточним после оформления.',support_email:'support@workkit.test',support_phone:'',work_hours:'Ежедневно 09:00–21:00',seller_name:'',seller_inn:'',seller_ogrn:'',seller_address:''}
const SiteContext=createContext<SiteConfig>(fallback)
export function SiteProvider({children}:{children:ReactNode}){const[c,setC]=useState(fallback);useEffect(()=>{api.siteConfig().then(x=>{setC(x);document.documentElement.style.setProperty('--primary',x.accent_color)}).catch(()=>{})},[]);return <SiteContext.Provider value={c}>{children}</SiteContext.Provider>}
export const useSite=()=>useContext(SiteContext)
