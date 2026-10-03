import {useEffect,useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {ArrowLeft,ArrowRight,BarChart3,Check,FileText,LayoutGrid,MessagesSquare,Palette,Presentation,RotateCcw,Sparkles,Workflow} from 'lucide-react'
import {Reveal} from './ui'
import {useProducts} from '../hooks'
import {GIFT_CATEGORY,money} from '../lib/format'

/* Every answer quietly nudges the estimate; the visitor only sees friendly questions. */
const TASKS=[
  {id:'tables',label:'Таблицы и финансы',hint:'учёт, финмодель, бюджет',icon:BarChart3,base:1690,cat:'analytics'},
  {id:'content',label:'Контент',hint:'контент-план, тексты, рубрики',icon:FileText,base:1430,cat:'content'},
  {id:'design',label:'Дизайн',hint:'экраны, баннеры, оформление',icon:Palette,base:2860,cat:'design'},
  {id:'slides',label:'Презентация',hint:'питч, отчёт, коммерческое',icon:Presentation,base:2370,cat:'design'},
  {id:'process',label:'Порядок в задачах',hint:'Notion, Trello, процессы',icon:Workflow,base:1180,cat:'workflow'},
  {id:'project',label:'Структура проекта',hint:'запуск, документы, план',icon:LayoutGrid,base:3270,cat:'business'},
]
const STEPS=[
  {key:'size',title:'Насколько большая задача?',options:[
    {id:'small',label:'Небольшая',hint:'одна понятная задача',mult:1},
    {id:'medium',label:'Средняя',hint:'несколько связанных частей',mult:1.45},
    {id:'large',label:'Крупная',hint:'проект под ключ',mult:2.1},
  ]},
  {key:'materials',title:'Что уже есть на руках?',options:[
    {id:'ready',label:'Почти всё готово',hint:'нужно довести до ума',mult:.88},
    {id:'partly',label:'Есть наброски',hint:'черновики, идеи, примеры',mult:1},
    {id:'scratch',label:'Начинаем с нуля',hint:'нужно всё продумать',mult:1.22},
  ]},
  {key:'timing',title:'Когда нужен результат?',options:[
    {id:'relaxed',label:'Не горит',hint:'в течение пары недель',mult:.94},
    {id:'week',label:'За неделю',hint:'обычный темп',mult:1},
    {id:'asap',label:'Как можно скорее',hint:'в приоритетной очереди',mult:1.33},
  ]},
] as const
type Answers={size?:string;materials?:string;timing?:string}

/** Rounds to tens but never lands on a multiple of 50: 1 480, 2 830, never 1 500 or 2 850. */
export const uneven=(v:number)=>{let n=Math.round(v/10)*10;if(n%50===0)n-=20;return Math.max(n,980)}

function useCountUp(target:number){
  const[v,setV]=useState(target)
  useEffect(()=>{
    if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setV(target);return}
    let raf=0;const start=performance.now();const from=0
    const tick=(t:number)=>{const k=Math.min(1,(t-start)/900);const e=1-Math.pow(1-k,3);setV(Math.round((from+(target-from)*e)/10)*10);if(k<1)raf=requestAnimationFrame(tick);else setV(target)}
    raf=requestAnimationFrame(tick)
    return()=>cancelAnimationFrame(raf)
  },[target])
  return v
}

export default function BudgetCalculator(){
  const[step,setStep]=useState(0) // 0 = tasks, 1..3 = questions, 4 = result
  const[tasks,setTasks]=useState<string[]>([])
  const[answers,setAnswers]=useState<Answers>({})
  const[dir,setDir]=useState<'fwd'|'back'>('fwd')
  const{products}=useProducts()
  const total=STEPS.length+1
  const go=(n:number)=>{setDir(n>step?'fwd':'back');setStep(n)}
  const toggle=(id:string)=>setTasks(t=>t.includes(id)?t.filter(x=>x!==id):[...t,id])
  function answer(key:string,id:string){setAnswers(a=>({...a,[key]:id}));setTimeout(()=>go(step+1),260)}
  function restart(){setTasks([]);setAnswers({});go(0)}

  const estimate=useMemo(()=>{
    // The biggest piece counts in full, every extra direction adds a bit less.
    const bases=TASKS.filter(t=>tasks.includes(t.id)).map(t=>t.base).sort((a,b)=>b-a)
    let sum=bases.reduce((s,b,i)=>s+b*(i===0?1:.78),0)
    for(const s of STEPS)sum*=s.options.find(o=>o.id===answers[s.key])?.mult??1
    return uneven(sum)
  },[tasks,answers])
  const low=uneven(estimate*.88),high=uneven(estimate*1.14)
  const shown=useCountUp(step===total?estimate:0)

  const picks=useMemo(()=>{
    const cats=new Set(TASKS.filter(t=>tasks.includes(t.id)).map(t=>t.cat))
    return products.filter(p=>p.category_slug!==GIFT_CATEGORY&&cats.has(p.category_slug)).map(p=>({p,v:[...p.variants].sort((a,b)=>Number(a.price)-Number(b.price))[0]})).sort((a,b)=>Number(a.v.price)-Number(b.v.price)).slice(0,3)
  },[products,tasks])
  const summary=[...TASKS.filter(t=>tasks.includes(t.id)).map(t=>t.label),...STEPS.map(s=>s.options.find(o=>o.id===answers[s.key])?.label).filter(Boolean)] as string[]

  return <section className="container section">
    <Reveal className="quiz">
      <div className="quizIntro">
        <span className="eyebrow"><Sparkles size={14}/>ПОДБОР ЗА МИНУТУ</span>
        <h2>Сколько будет стоить ваша задача?</h2>
        <p>Ответьте на четыре коротких вопроса — подскажем ориентир по бюджету и подходящие пакеты. Без звонков и регистрации.</p>
        <ol className="quizTrack">
          {['Что нужно','Объём','Материалы','Сроки'].map((l,i)=><li key={l} className={step>i?'done':step===i?'now':''}><i>{step>i?<Check size={13}/>:i+1}</i>{l}</li>)}
        </ol>
      </div>
      <div className="quizBody">
        <div className="quizProgress"><span style={{width:`${Math.min(step,total)/total*100}%`}}/></div>
        <div className={`quizStage ${dir}`} key={step}>
          {step===0&&<>
            <div className="quizQ"><small>Вопрос 1 из {total}</small><h3>Что нужно сделать?</h3><p>Можно выбрать несколько вариантов</p></div>
            <div className="quizGrid">{TASKS.map(t=><button key={t.id} type="button" className={`quizOpt${tasks.includes(t.id)?' active':''}`} onClick={()=>toggle(t.id)} aria-pressed={tasks.includes(t.id)}>
              <span className="quizIcon"><t.icon size={20}/></span><span className="quizText"><b>{t.label}</b><small>{t.hint}</small></span><i className="quizCheck"><Check size={13}/></i>
            </button>)}</div>
            <div className="quizNav"><span className="muted">{tasks.length?`Выбрано: ${tasks.length}`:'Выберите хотя бы одно'}</span><button type="button" className="btn primary" disabled={!tasks.length} onClick={()=>go(1)}>Дальше<ArrowRight size={17}/></button></div>
          </>}
          {step>=1&&step<=STEPS.length&&(()=>{const s=STEPS[step-1];return <>
            <div className="quizQ"><small>Вопрос {step+1} из {total}</small><h3>{s.title}</h3></div>
            <div className="quizList">{s.options.map(o=><button key={o.id} type="button" className={`quizOpt row${answers[s.key]===o.id?' active':''}`} onClick={()=>answer(s.key,o.id)}>
              <i className="radio"/><span className="quizText"><b>{o.label}</b><small>{o.hint}</small></span>
            </button>)}</div>
            <div className="quizNav"><button type="button" className="textBtn" onClick={()=>go(step-1)}><ArrowLeft size={15}/>Назад</button>{answers[s.key]&&<button type="button" className="btn ghost sm" onClick={()=>go(step+1)}>Дальше<ArrowRight size={15}/></button>}</div>
          </>})()}
          {step===total&&<div className="quizResult">
            <span className="label">Ориентировочный бюджет</span>
            <b className="quizPrice">≈ {money(shown)}</b>
            <span className="quizRange">обычно от {money(low)} до {money(high)}</span>
            <div className="quizTags">{summary.map(s=><span key={s}>{s}</span>)}</div>
            {picks.length>0&&<div className="quizPicks"><span className="label">Подойдут готовые пакеты</span>{picks.map(({p,v})=><Link key={p.id} to={`/product/${p.slug}`}><span>{p.title}</span><b>от {money(v.price)}</b><ArrowRight size={15}/></Link>)}</div>}
            <div className="quizActions"><Link className="btn primary lg" to="/contacts"><MessagesSquare size={18}/>Обсудить задачу</Link><button type="button" className="btn ghost lg" onClick={restart}><RotateCcw size={17}/>Пройти заново</button></div>
            <p className="fine">Это ориентир: точную стоимость и состав работ фиксируем в заявке до оплаты.</p>
          </div>}
        </div>
      </div>
    </Reveal>
  </section>
}
