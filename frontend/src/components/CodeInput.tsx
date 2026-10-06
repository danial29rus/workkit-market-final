import {useRef} from 'react'

/** Six separate digit boxes that behave like one field: typing advances, paste fills all, backspace goes back. */
export default function CodeInput({value,onChange,length=6,disabled,invalid}:{value:string;onChange:(v:string)=>void;length?:number;disabled?:boolean;invalid?:boolean}){
  const refs=useRef<(HTMLInputElement|null)[]>([])
  const digits=Array.from({length},(_,i)=>value[i]||'')
  function setAt(i:number,raw:string){
    const clean=raw.replace(/\D/g,'')
    if(!clean){onChange(value.slice(0,i)+value.slice(i+1));return}
    const next=(value.slice(0,i)+clean+value.slice(i+clean.length)).slice(0,length)
    onChange(next)
    refs.current[Math.min(length-1,i+clean.length)]?.focus()
  }
  return <div className={`codeInput${invalid?' invalid':''}`} onPaste={e=>{e.preventDefault();const t=e.clipboardData.getData('text').replace(/\D/g,'').slice(0,length);if(t){onChange(t);refs.current[Math.min(length-1,t.length)]?.focus()}}}>
    {digits.map((d,i)=><input key={i} ref={el=>{refs.current[i]=el}} value={d} disabled={disabled} inputMode="numeric" autoComplete={i===0?'one-time-code':'off'} maxLength={length} aria-label={`Цифра ${i+1}`} autoFocus={i===0}
      onChange={e=>setAt(i,e.target.value.slice(-length))}
      onKeyDown={e=>{
        if(e.key==='Backspace'&&!d&&i>0){e.preventDefault();onChange(value.slice(0,i-1)+value.slice(i));refs.current[i-1]?.focus()}
        if(e.key==='ArrowLeft'&&i>0)refs.current[i-1]?.focus()
        if(e.key==='ArrowRight'&&i<length-1)refs.current[i+1]?.focus()
      }}
      onFocus={e=>e.target.select()}/>)}
  </div>
}
