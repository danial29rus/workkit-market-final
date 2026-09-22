import {useMemo,useState} from 'react'
import {Link} from 'react-router-dom'
import {Calculator} from 'lucide-react'

const MIN_BUDGET=100
const MAX_BUDGET=20000

const COMPLEXITY=[
  {value:'simple',label:'Простая',mult:1},
  {value:'medium',label:'Средняя',mult:1.3},
  {value:'complex',label:'Комплексная',mult:1.7},
]

const URGENCY=[
  {value:'standard',label:'Стандартный срок',mult:1},
  {value:'fast',label:'Ускоренно',mult:1.25},
]

const money=(v:number)=>new Intl.NumberFormat('ru-RU',{style:'currency',currency:'RUB',maximumFractionDigits:0}).format(v)

export default function BudgetCalculator(){
  const[scope,setScope]=useState(6000)
  const[complexity,setComplexity]=useState('medium')
  const[urgency,setUrgency]=useState('standard')

  const estimate=useMemo(()=>{
    const cMult=COMPLEXITY.find(c=>c.value===complexity)?.mult||1
    const uMult=URGENCY.find(u=>u.value===urgency)?.mult||1
    const raw=scope*cMult*uMult
    const rounded=Math.round(raw/50)*50
    return Math.min(Math.max(rounded,MIN_BUDGET),MAX_BUDGET*2)
  },[scope,complexity,urgency])

  const low=Math.round(estimate*0.9/50)*50
  const high=Math.round(estimate*1.1/50)*50

  return <section className="container section">
    <div className="calcCard">
      <div className="calcIntro">
        <span className="eyebrow">ПРИКИДКА БЮДЖЕТА</span>
        <h2><Calculator size={26}/> Калькулятор комплекса услуг</h2>
        <p>Если нужно несколько услуг сразу или задача нестандартная, прикиньте примерный бюджет здесь. Это ориентир, а не точная цена — точную стоимость и состав согласуем после заявки.</p>
      </div>
      <div className="calcBody">
        <label className="calcSlider">
          <div className="calcSliderHead"><span>Объём задачи</span><b>{money(scope)}</b></div>
          <input type="range" min={MIN_BUDGET} max={MAX_BUDGET} step={100} value={scope} onChange={e=>setScope(Number(e.target.value))}/>
          <div className="calcSliderRange"><span>{money(MIN_BUDGET)}</span><span>{money(MAX_BUDGET)}</span></div>
        </label>
        <div className="calcOptions">
          <div>
            <span>Сложность</span>
            <div className="calcChips">{COMPLEXITY.map(c=><button key={c.value} type="button" className={complexity===c.value?'active':''} onClick={()=>setComplexity(c.value)}>{c.label}</button>)}</div>
          </div>
          <div>
            <span>Срочность</span>
            <div className="calcChips">{URGENCY.map(u=><button key={u.value} type="button" className={urgency===u.value?'active':''} onClick={()=>setUrgency(u.value)}>{u.label}</button>)}</div>
          </div>
        </div>
        <div className="calcResult">
          <span>Ориентировочный бюджет</span>
          <b>{money(low)} – {money(high)}</b>
          <small>Итоговая стоимость зависит от точного состава работ и фиксируется в заявке.</small>
        </div>
        <Link className="primary wide" to="/contacts">Обсудить и оставить заявку</Link>
      </div>
    </div>
  </section>
}
