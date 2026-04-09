'use client'

import { useState, useEffect, useCallback } from 'react'
import { useToast } from '@/lib/toast'

// ── Constants ─────────────────────────────────────────────────────────────
const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DAYS_SHORT = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
const HOURS = Array.from({length:24},(_,i)=>`${String(i).padStart(2,'0')}:00`)

const BR_HOLIDAYS: Record<string,string> = {
  '01-01':'Ano Novo','04-21':'Tiradentes','05-01':'Dia do Trabalho',
  '09-07':'Independência do Brasil','10-12':'N. S. Aparecida','11-02':'Finados',
  '11-15':'Proclamação da República','11-20':'Consciência Negra','12-25':'Natal',
}

// ── Design tokens (padrão do projeto) ────────────────────────────────────
const BG      = '#0d0f12'
const CARD    = '#111318'
const BORDER  = '#1f2229'
const PRIMARY = '#e8c547'
const TEXT_S  = '#4b5563'
const TEXT_P  = '#f0ece4'
const FONT    = "'Montserrat','Open Sans',Roboto,-apple-system,sans-serif"

const TYPE_LABEL: Record<string,string> = {capt:'Captação',entrega:'Entrega',fixo:'Fixo',manual:'Evento',reuniao:'Reunião'}
const TYPE_COLOR: Record<string,string> = {capt:'#e8c547',entrega:'#5db87a',fixo:'#5b9bd5',manual:'#e8924a',reuniao:'#9b8fd5'}

// ── Types ─────────────────────────────────────────────────────────────────
interface CalEvent {
  id: string
  title: string
  event_date: string
  event_time?: string
  event_type: 'capt'|'entrega'|'fixo'|'manual'|'reuniao'
  notes?: string
  created_at: string
}
type CalView  = 'mes'|'semana'|'dia'
type SubView  = 'compacto'|'normal'|'expandido'|'ocultar'

// ── Helpers ───────────────────────────────────────────────────────────────
function pad(n:number){return String(n).padStart(2,'0')}
function mkDs(y:number,m:number,d:number){return `${y}-${pad(m+1)}-${pad(d)}`}
function fd(d:string){if(!d)return'—';const[y,m,day]=d.split('-');return`${day}/${m}/${y}`}
function ft(t?:string){if(!t)return'';return t.slice(0,5)}
function getDIM(y:number,m:number){return new Date(y,m+1,0).getDate()}
function getFDOW(y:number,m:number){return new Date(y,m,1).getDay()}
function getHoliday(ds:string){return BR_HOLIDAYS[ds.slice(5)]||null}
function getWeekDates(y:number,m:number,d:number){
  const base=new Date(y,m,d)
  const dow=base.getDay()
  const sun=new Date(base)
  sun.setDate(base.getDate()-dow)
  return Array.from({length:7},(_,i)=>{
    const dt=new Date(sun)
    dt.setDate(sun.getDate()+i)
    return{y:dt.getFullYear(),m:dt.getMonth(),d:dt.getDate()}
  })
}

// ── Input style ───────────────────────────────────────────────────────────
const INP: React.CSSProperties = {
  width:'100%',padding:'9px 12px',background:'#2a2a32',
  border:`1px solid ${BORDER}`,borderRadius:'8px',color:TEXT_P,
  fontSize:'13px',outline:'none',boxSizing:'border-box',fontFamily:FONT,
}

// ── Toggle Switch ─────────────────────────────────────────────────────────
function ToggleSwitch({on,set}:{on:boolean,set:(v:boolean)=>void}){
  return(
    <div onClick={()=>set(!on)} style={{
      width:'44px',height:'24px',borderRadius:'9999px',
      background:on?PRIMARY:BORDER,cursor:'pointer',
      position:'relative',flexShrink:0,transition:'background 200ms ease',
    }}>
      <div style={{
        position:'absolute',top:'3px',
        left:on?'23px':'3px',
        width:'18px',height:'18px',borderRadius:'9999px',
        background:'#fff',transition:'left 200ms ease',
      }}/>
    </div>
  )
}

// ── Month View ────────────────────────────────────────────────────────────
function MonthView({y,m,evOn,openCreate,openView,todayDs,showHolidays}:{
  y:number,m:number,
  evOn:(ds:string)=>CalEvent[],
  openCreate:(ds?:string)=>void,
  openView:(e:CalEvent)=>void,
  todayDs:string,
  showHolidays:boolean,
}){
  const dim=getDIM(y,m)
  const fdow=getFDOW(y,m)
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:'12px',overflow:'hidden'}}>
      {/* Day headers */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:`1px solid ${BORDER}`}}>
        {DAYS_SHORT.map(d=>(
          <div key={d} style={{padding:'10px 0',textAlign:'center',fontSize:'12px',color:TEXT_S,fontWeight:600,textTransform:'uppercase',letterSpacing:'1px'}}>{d}</div>
        ))}
      </div>
      {/* Grid */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
        {Array.from({length:fdow}).map((_,i)=>(
          <div key={`e${i}`} style={{minHeight:'100px',borderRight:`1px solid ${BORDER}`,borderBottom:`1px solid ${BORDER}`,background:'rgba(0,0,0,0.1)'}}/>
        ))}
        {Array.from({length:dim}).map((_,i)=>{
          const day=i+1
          const ds=mkDs(y,m,day)
          const isToday=ds===todayDs
          const dayEvs=evOn(ds)
          const holiday=showHolidays?getHoliday(ds):null
          const col=(fdow+i)%7
          return(
            <div key={day} onClick={()=>openCreate(ds)}
              style={{
                minHeight:'100px',
                borderRight:col<6?`1px solid ${BORDER}`:'none',
                borderBottom:`1px solid ${BORDER}`,
                padding:'8px 6px',cursor:'pointer',
                background:isToday?`rgba(232,197,71,0.05)`:'transparent',
                transition:'background 200ms ease',
              }}
              onMouseEnter={e=>{if(!isToday)e.currentTarget.style.background='rgba(255,255,255,0.03)'}}
              onMouseLeave={e=>{e.currentTarget.style.background=isToday?'rgba(232,197,71,0.05)':'transparent'}}
            >
              <div style={{
                width:'32px',height:'32px',borderRadius:'9999px',
                display:'flex',alignItems:'center',justifyContent:'center',
                fontSize:'14px',fontWeight:isToday?700:400,
                background:isToday?PRIMARY:'transparent',
                color:isToday?'#fff':TEXT_P,marginBottom:'5px',
              }}>{day}</div>
              {holiday&&(
                <div style={{
                  fontSize:'10px',fontWeight:500,
                  padding:'2px 6px 2px 8px',
                  borderRadius:'0 4px 4px 0',
                  background:'rgba(232,197,71,0.15)',
                  borderLeft:`3px solid ${PRIMARY}`,
                  color:PRIMARY,marginBottom:'3px',
                  overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                }}>{holiday}</div>
              )}
              {dayEvs.slice(0,holiday?2:3).map(ev=>(
                <div key={ev.id} onClick={e=>{e.stopPropagation();openView(ev)}}
                  style={{
                    fontSize:'10px',fontWeight:500,
                    padding:'2px 5px',borderRadius:'4px',marginBottom:'2px',
                    background:TYPE_COLOR[ev.event_type]+'22',
                    color:TYPE_COLOR[ev.event_type],
                    overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',cursor:'pointer',
                  }}
                  title={ev.title}
                >
                  {ev.event_time?`${ft(ev.event_time)} `:''}{ev.title}
                </div>
              ))}
              {dayEvs.length>(holiday?2:3)&&(
                <div style={{fontSize:'10px',color:TEXT_S}}>+{dayEvs.length-(holiday?2:3)} mais</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Week View ─────────────────────────────────────────────────────────────
function WeekView({y,m,d,evOn,openCreate,openView,todayDs,subView}:{
  y:number,m:number,d:number,
  evOn:(ds:string)=>CalEvent[],
  openCreate:(ds?:string)=>void,
  openView:(e:CalEvent)=>void,
  todayDs:string,
  subView:SubView,
}){
  const wk=getWeekDates(y,m,d)
  const HH=subView==='compacto'?28:subView==='expandido'?72:44
  const hours=subView==='ocultar'
    ?HOURS.filter((_,hi)=>wk.some(wd=>evOn(mkDs(wd.y,wd.m,wd.d)).some(e=>e.event_time&&parseInt(e.event_time)===hi)))
    :HOURS
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:'12px',overflow:'hidden'}}>
      {/* Header */}
      <div style={{display:'grid',gridTemplateColumns:`60px repeat(7,1fr)`,borderBottom:`1px solid ${BORDER}`}}>
        <div style={{borderRight:`1px solid ${BORDER}`}}/>
        {wk.map(wd=>{
          const ds=mkDs(wd.y,wd.m,wd.d)
          const isToday=ds===todayDs
          const dow=new Date(wd.y,wd.m,wd.d).getDay()
          return(
            <div key={ds} style={{padding:'10px 0',textAlign:'center',borderRight:`1px solid ${BORDER}`}}>
              <div style={{fontSize:'11px',color:TEXT_S,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>{DAYS_SHORT[dow]}</div>
              <div style={{
                width:'30px',height:'30px',borderRadius:'9999px',
                display:'flex',alignItems:'center',justifyContent:'center',
                margin:'0 auto',fontSize:'13px',fontWeight:isToday?700:400,
                background:isToday?PRIMARY:'transparent',
                color:isToday?'#fff':TEXT_P,
              }}>{wd.d}</div>
            </div>
          )
        })}
      </div>
      {/* Hour rows */}
      <div style={{maxHeight:'560px',overflowY:'auto'}}>
        {hours.map(hour=>(
          <div key={hour} style={{display:'grid',gridTemplateColumns:`60px repeat(7,1fr)`,borderBottom:`1px solid ${BORDER}`,minHeight:`${HH}px`}}>
            <div style={{padding:'4px 8px 0',fontSize:'11px',color:TEXT_S,borderRight:`1px solid ${BORDER}`,flexShrink:0,lineHeight:1}}>{hour}</div>
            {wk.map(wd=>{
              const ds=mkDs(wd.y,wd.m,wd.d)
              const isToday=ds===todayDs
              const hourEvs=evOn(ds).filter(e=>e.event_time?.startsWith(hour.slice(0,2)))
              return(
                <div key={ds} onClick={()=>openCreate(ds)}
                  style={{
                    borderRight:`1px solid ${BORDER}`,
                    background:isToday?'rgba(232,197,71,0.02)':'transparent',
                    padding:'2px',cursor:'pointer',minHeight:`${HH}px`,
                    transition:'background 200ms ease',
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.background=isToday?'rgba(232,197,71,0.05)':'rgba(255,255,255,0.03)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background=isToday?'rgba(232,197,71,0.02)':'transparent'}}
                >
                  {hourEvs.map(ev=>(
                    <div key={ev.id} onClick={e=>{e.stopPropagation();openView(ev)}}
                      style={{
                        fontSize:'10px',fontWeight:500,cursor:'pointer',
                        padding:'2px 5px',borderRadius:'4px',marginBottom:'2px',
                        background:TYPE_COLOR[ev.event_type]+'22',
                        color:TYPE_COLOR[ev.event_type],
                        overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',
                      }}
                    >{ev.title}</div>
                  ))}
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Day View ──────────────────────────────────────────────────────────────
function DayView({y,m,d,evOn,openCreate,openView,todayDs,subView}:{
  y:number,m:number,d:number,
  evOn:(ds:string)=>CalEvent[],
  openCreate:(ds?:string)=>void,
  openView:(e:CalEvent)=>void,
  todayDs:string,
  subView:SubView,
}){
  const ds=mkDs(y,m,d)
  const isToday=ds===todayDs
  const dow=new Date(y,m,d).getDay()
  const holiday=getHoliday(ds)
  const dayEvs=evOn(ds)
  const HH=subView==='compacto'?28:subView==='expandido'?72:44
  const hours=subView==='ocultar'
    ?HOURS.filter((_,hi)=>dayEvs.some(e=>e.event_time&&parseInt(e.event_time)===hi))
    :HOURS
  const allDay=dayEvs.filter(e=>!e.event_time)
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:'12px',overflow:'hidden'}}>
      {/* Day header */}
      <div style={{padding:'20px 24px',borderBottom:`1px solid ${BORDER}`,display:'flex',alignItems:'center',gap:'16px'}}>
        <div style={{
          width:'48px',height:'48px',borderRadius:'9999px',
          display:'flex',alignItems:'center',justifyContent:'center',
          background:isToday?PRIMARY:'#2a2a32',
          fontSize:'20px',fontWeight:700,color:isToday?'#fff':TEXT_P,flexShrink:0,
        }}>{d}</div>
        <div>
          <div style={{fontSize:'12px',color:TEXT_S,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'4px'}}>{DAYS_SHORT[dow]}</div>
          {holiday&&(
            <span style={{display:'inline-flex',alignItems:'center',gap:'4px',padding:'2px 10px',borderRadius:'9999px',background:'rgba(232,197,71,0.15)',color:PRIMARY,fontSize:'11px',fontWeight:500}}>
              🎌 {holiday}
            </span>
          )}
        </div>
        <span style={{marginLeft:'auto',fontSize:'13px',color:TEXT_S}}>{dayEvs.length} evento{dayEvs.length!==1?'s':''}</span>
      </div>
      {/* All-day events */}
      {allDay.length>0&&(
        <div style={{padding:'8px 16px',borderBottom:`1px solid ${BORDER}`,display:'flex',flexWrap:'wrap',gap:'6px',alignItems:'center'}}>
          <span style={{fontSize:'11px',color:TEXT_S}}>Dia todo:</span>
          {allDay.map(ev=>(
            <div key={ev.id} onClick={()=>openView(ev)} style={{padding:'3px 10px',borderRadius:'20px',fontSize:'11px',fontWeight:500,background:TYPE_COLOR[ev.event_type]+'22',color:TYPE_COLOR[ev.event_type],cursor:'pointer'}}>{ev.title}</div>
          ))}
        </div>
      )}
      {/* Hour grid */}
      <div style={{maxHeight:'560px',overflowY:'auto'}}>
        {hours.map(hour=>{
          const hourEvs=dayEvs.filter(e=>e.event_time?.startsWith(hour.slice(0,2)))
          return(
            <div key={hour} onClick={()=>openCreate(ds)}
              style={{display:'grid',gridTemplateColumns:'70px 1fr',borderBottom:`1px solid ${BORDER}`,minHeight:`${HH}px`,cursor:'pointer',transition:'background 200ms ease'}}
              onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)'}}
              onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
            >
              <div style={{padding:'4px 12px 0',fontSize:'11px',color:TEXT_S,borderRight:`1px solid ${BORDER}`,lineHeight:1}}>{hour}</div>
              <div style={{padding:'4px 8px'}}>
                {hourEvs.map(ev=>(
                  <div key={ev.id} onClick={e=>{e.stopPropagation();openView(ev)}}
                    style={{
                      fontSize:'12px',fontWeight:500,cursor:'pointer',
                      padding:'4px 10px',borderRadius:'6px',marginBottom:'3px',
                      background:TYPE_COLOR[ev.event_type]+'22',
                      color:TYPE_COLOR[ev.event_type],
                      borderLeft:`3px solid ${TYPE_COLOR[ev.event_type]}`,
                      display:'flex',gap:'10px',alignItems:'center',
                    }}
                  >
                    <span style={{fontWeight:700,fontSize:'11px'}}>{ft(ev.event_time)}</span>
                    <span>{ev.title}</span>
                    <span style={{fontSize:'10px',opacity:0.6}}>{TYPE_LABEL[ev.event_type]}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Blank form ────────────────────────────────────────────────────────────
const BLANK=():Partial<CalEvent>=>(
  {title:'',event_type:'manual',notes:'',event_date:new Date().toISOString().split('T')[0],event_time:''}
)

// ── Main page ─────────────────────────────────────────────────────────────
export default function AgendaPage(){
  const toast=useToast()
  const[events,setEvents]=useState<CalEvent[]>([])
  const[loading,setLoading]=useState(true)
  const[showModal,setShowModal]=useState(false)
  const[editing,setEditing]=useState<CalEvent|null>(null)
  const[form,setForm]=useState<Partial<CalEvent>>(BLANK())
  const[saving,setSaving]=useState(false)

  const now=new Date()
  const[view,setView]=useState<CalView>('mes')
  const[subView,setSubView]=useState<SubView>('normal')
  const[ancY,setAncY]=useState(now.getFullYear())
  const[ancM,setAncM]=useState(now.getMonth())
  const[ancD,setAncD]=useState(now.getDate())
  const[showHol,setShowHol]=useState(true)
  const[showEntregas,setShowEntregas]=useState(true)
  const[showCapts,setShowCapts]=useState(true)
  const[showReunioes,setShowReunioes]=useState(true)
  const[viewEv,setViewEv]=useState<CalEvent|null>(null)

  const todayDs=`${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`

  const load=useCallback(async()=>{
    setLoading(true)
    const r=await fetch('/api/events')
    const d=await r.json()
    setEvents(Array.isArray(d)?d:[])
    setLoading(false)
  },[])

  useEffect(()=>{load()},[load])

  function goToday(){setAncY(now.getFullYear());setAncM(now.getMonth());setAncD(now.getDate())}

  function navigate(dir:1|-1){
    if(view==='mes'){
      let nm=ancM+dir,ny=ancY
      if(nm<0){nm=11;ny--}else if(nm>11){nm=0;ny++}
      setAncM(nm);setAncY(ny)
    }else if(view==='semana'){
      const b=new Date(ancY,ancM,ancD);b.setDate(b.getDate()+dir*7)
      setAncY(b.getFullYear());setAncM(b.getMonth());setAncD(b.getDate())
    }else{
      const b=new Date(ancY,ancM,ancD);b.setDate(b.getDate()+dir)
      setAncY(b.getFullYear());setAncM(b.getMonth());setAncD(b.getDate())
    }
  }

  function evOn(ds:string){
    return events.filter(e=>{
      if(e.event_date!==ds)return false
      if(e.event_type==='entrega'&&!showEntregas)return false
      if(e.event_type==='capt'&&!showCapts)return false
      if((e.event_type==='fixo'||e.event_type==='manual'||e.event_type==='reuniao')&&!showReunioes)return false
      return true
    }).sort((a,b)=>(a.event_time||'').localeCompare(b.event_time||''))
  }

  function openCreate(date?:string){
    setEditing(null)
    setForm({...BLANK(),event_date:date||BLANK().event_date})
    setShowModal(true)
  }

  function openEdit(e:CalEvent){
    setEditing(e)
    setForm({title:e.title,event_type:e.event_type,notes:e.notes||'',event_date:e.event_date,event_time:e.event_time||''})
    setShowModal(true)
  }

  function openView(e:CalEvent){
    setViewEv(e)
  }

  async function handleSave(){
    if(!form.title?.trim()){toast.show('Informe o título','error');return}
    if(!form.event_date){toast.show('Informe a data','error');return}
    setSaving(true)
    try{
      const payload={...form,event_time:form.event_time||null}
      const url=editing?`/api/events/${editing.id}`:'/api/events'
      const res=await fetch(url,{method:editing?'PUT':'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)})
      if(!res.ok){const e=await res.json();throw new Error(e.error)}
      await load();setShowModal(false)
      toast.show(editing?'Evento atualizado!':'Evento criado!','success')
    }catch(e:unknown){toast.show('Erro: '+(e instanceof Error?e.message:'Erro'),'error')}
    finally{setSaving(false)}
  }

  async function handleDelete(id:string){
    if(!confirm('Excluir este evento?'))return
    await fetch(`/api/events/${id}`,{method:'DELETE'})
    await load();toast.show('Evento excluído','success')
    setShowModal(false)
  }

  function viewTitle(){
    if(view==='mes')return`${MONTHS[ancM]} ${ancY}`
    if(view==='semana'){
      const wk=getWeekDates(ancY,ancM,ancD)
      const a=wk[0],z=wk[6]
      if(a.m===z.m)return`${a.d} – ${z.d} de ${MONTHS[a.m]} ${a.y}`
      if(a.y===z.y)return`${a.d} ${MONTHS[a.m].slice(0,3)} – ${z.d} ${MONTHS[z.m].slice(0,3)} ${a.y}`
      return`${a.d} ${MONTHS[a.m].slice(0,3)} ${a.y} – ${z.d} ${MONTHS[z.m].slice(0,3)} ${z.y}`
    }
    return`${ancD} de ${MONTHS[ancM]} de ${ancY}`
  }

  // Upcoming events for sidebar
  const upcoming=events.filter(e=>e.event_date>=todayDs)
    .sort((a,b)=>a.event_date.localeCompare(b.event_date)||(a.event_time||'').localeCompare(b.event_time||''))
    .slice(0,8)

  if(loading)return(
    <div style={{color:TEXT_S,padding:'40px',textAlign:'center',background:BG,minHeight:'100vh',fontFamily:FONT}}>
      Carregando...
    </div>
  )

  return(
    <div style={{fontFamily:FONT,background:BG,minHeight:'100vh',padding:'28px 32px',color:TEXT_P}}>

      {/* Page header */}
      <div style={{marginBottom:'24px'}}>
        <h1 style={{fontSize:'30px',fontWeight:700,color:TEXT_P,lineHeight:1.2,marginBottom:'6px',fontFamily:FONT}}>
          Timeline de Projetos
        </h1>
        <p style={{fontSize:'12px',color:TEXT_S,fontWeight:400}}>
          Visualização completa de todas as etapas e prazos
        </p>
      </div>

      {/* Google Calendar banner */}
      <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:'12px',padding:'14px 20px',display:'flex',alignItems:'center',gap:'16px',marginBottom:'20px'}}>
        <div style={{width:'36px',height:'36px',borderRadius:'8px',background:'rgba(232,197,71,0.12)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PRIMARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:'13px',fontWeight:600,color:TEXT_P,marginBottom:'2px'}}>Google Calendar</div>
          <div style={{fontSize:'12px',color:TEXT_S,fontWeight:400}}>Conecte para sincronizar eventos automaticamente</div>
        </div>
        <button
          style={{padding:'7px 16px',background:'transparent',border:`1px solid ${PRIMARY}`,borderRadius:'10px',color:PRIMARY,fontSize:'14px',fontWeight:500,cursor:'pointer',transition:'background 200ms ease',flexShrink:0,fontFamily:FONT}}
          onMouseEnter={e=>{e.currentTarget.style.background='rgba(232,197,71,0.1)'}}
          onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
        >Conectar</button>
      </div>

      {/* Controls */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'12px',marginBottom:'16px'}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',flexWrap:'wrap'}}>
          {/* View toggle */}
          <div style={{display:'flex',background:CARD,borderRadius:'12px',padding:'4px',gap:'2px'}}>
            {(['mes','semana','dia'] as CalView[]).map(v=>(
              <button key={v} onClick={()=>setView(v)} style={{
                padding:'6px 14px',borderRadius:'10px',fontSize:'14px',fontWeight:500,
                cursor:'pointer',border:'none',fontFamily:FONT,
                background:view===v?'rgba(232,197,71,0.9)':'transparent',
                color:view===v?'#000':TEXT_S,transition:'all 200ms ease',
              }}>
                {{mes:'Mês',semana:'Semana',dia:'Dia'}[v]}
              </button>
            ))}
          </div>
          {/* Navigation */}
          <div style={{display:'flex',alignItems:'center',gap:'6px'}}>
            <button onClick={goToday} style={{padding:'6px 14px',background:BG,border:'1px solid #2b2b31',borderRadius:'10px',fontSize:'14px',fontWeight:500,cursor:'pointer',color:TEXT_P,transition:'all 200ms ease',fontFamily:FONT}}>
              Hoje
            </button>
            <button onClick={()=>navigate(-1)} style={{width:'32px',height:'32px',background:BG,border:'1px solid #2b2b31',borderRadius:'8px',cursor:'pointer',color:TEXT_S,fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 200ms ease'}}>
              ‹
            </button>
            <button onClick={()=>navigate(1)} style={{width:'32px',height:'32px',background:BG,border:'1px solid #2b2b31',borderRadius:'8px',cursor:'pointer',color:TEXT_S,fontSize:'18px',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 200ms ease'}}>
              ›
            </button>
            <span style={{fontSize:'15px',fontWeight:600,color:TEXT_P,minWidth:'220px',paddingLeft:'4px'}}>{viewTitle()}</span>
          </div>
        </div>
        <button onClick={()=>openCreate()} style={{
          padding:'9px 20px',background:PRIMARY,border:'none',borderRadius:'10px',
          color:'#000',fontSize:'14px',fontWeight:600,cursor:'pointer',
          transition:'opacity 200ms ease',fontFamily:FONT,
        }}
          onMouseEnter={e=>{e.currentTarget.style.opacity='0.85'}}
          onMouseLeave={e=>{e.currentTarget.style.opacity='1'}}
        >+ Novo Evento</button>
      </div>

      {/* Filters */}
      <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'16px',alignItems:'center'}}>
        {[
          {label:'Mostrar Feriados',icon:'🎌',val:showHol,set:setShowHol},
          {label:'Exibir entregas',icon:'📦',val:showEntregas,set:setShowEntregas},
          {label:'Exibir captações',icon:'🎬',val:showCapts,set:setShowCapts},
          {label:'Exibir reuniões',icon:'🤝',val:showReunioes,set:setShowReunioes},
        ].map(f=>(
          <div key={f.label} style={{display:'flex',alignItems:'center',gap:'8px',background:CARD,border:`1px solid ${BORDER}`,borderRadius:'8px',padding:'7px 12px'}}>
            <span style={{fontSize:'14px'}}>{f.icon}</span>
            <span style={{fontSize:'13px',color:TEXT_S,fontWeight:500}}>{f.label}</span>
            <ToggleSwitch on={f.val} set={f.set}/>
          </div>
        ))}
      </div>

      {/* Sub-views (Semana / Dia only) */}
      {(view==='semana'||view==='dia')&&(
        <div style={{display:'inline-flex',background:CARD,borderRadius:'12px',padding:'4px',gap:'2px',marginBottom:'16px'}}>
          {(['compacto','normal','expandido','ocultar'] as SubView[]).map(sv=>(
            <button key={sv} onClick={()=>setSubView(sv)} style={{
              padding:'5px 12px',borderRadius:'10px',fontSize:'13px',fontWeight:500,
              cursor:'pointer',border:'none',fontFamily:FONT,
              background:subView===sv?'rgba(232,197,71,0.9)':'transparent',
              color:subView===sv?'#000':TEXT_S,transition:'all 200ms ease',
            }}>
              {{compacto:'Compacto',normal:'Normal',expandido:'Expandido',ocultar:'Ocultar vazios'}[sv]}
            </button>
          ))}
        </div>
      )}

      {/* Calendar grid */}
      <div style={{display:'grid',gridTemplateColumns:view==='mes'?'1fr 260px':'1fr',gap:'16px'}}>
        <div>
          {view==='mes'&&(
            <MonthView y={ancY} m={ancM} evOn={evOn} openCreate={openCreate} openView={openView} todayDs={todayDs} showHolidays={showHol}/>
          )}
          {view==='semana'&&(
            <WeekView y={ancY} m={ancM} d={ancD} evOn={evOn} openCreate={openCreate} openView={openView} todayDs={todayDs} subView={subView}/>
          )}
          {view==='dia'&&(
            <DayView y={ancY} m={ancM} d={ancD} evOn={evOn} openCreate={openCreate} openView={openView} todayDs={todayDs} subView={subView}/>
          )}
        </div>

        {/* Sidebar (month view only) */}
        {view==='mes'&&(
          <div style={{display:'flex',flexDirection:'column',gap:'12px'}}>
            {/* Legend */}
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:'12px',padding:'16px'}}>
              <h3 style={{fontSize:'11px',color:TEXT_S,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600,marginBottom:'12px'}}>Tipos de evento</h3>
              {Object.entries(TYPE_LABEL).map(([key,label])=>(
                <div key={key} style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                  <div style={{width:'8px',height:'8px',borderRadius:'50%',background:TYPE_COLOR[key]}}/>
                  <span style={{fontSize:'12px',color:TEXT_S}}>{label}</span>
                </div>
              ))}
            </div>
            {/* Upcoming */}
            <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:'12px',padding:'16px'}}>
              <h3 style={{fontSize:'11px',color:TEXT_S,textTransform:'uppercase',letterSpacing:'1px',fontWeight:600,marginBottom:'12px'}}>Próximos eventos</h3>
              {upcoming.length===0?(
                <div style={{fontSize:'12px',color:TEXT_S,textAlign:'center',padding:'12px 0'}}>Nenhum evento próximo</div>
              ):upcoming.map(ev=>(
                <div key={ev.id} onClick={()=>openView(ev)}
                  style={{display:'flex',gap:'10px',alignItems:'flex-start',marginBottom:'8px',cursor:'pointer',padding:'6px',borderRadius:'8px',transition:'background 200ms ease'}}
                  onMouseEnter={e=>{e.currentTarget.style.background='rgba(255,255,255,0.04)'}}
                  onMouseLeave={e=>{e.currentTarget.style.background='transparent'}}
                >
                  <div style={{width:'3px',height:'34px',borderRadius:'2px',background:TYPE_COLOR[ev.event_type],flexShrink:0,marginTop:'2px'}}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:'12px',color:TEXT_P,fontWeight:500,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.title}</div>
                    <div style={{fontSize:'11px',color:TEXT_S,marginTop:'2px'}}>{fd(ev.event_date)}{ev.event_time?` às ${ft(ev.event_time)}`:''} · {TYPE_LABEL[ev.event_type]}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ViewEvent Modal */}
      {viewEv&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}
          onClick={()=>setViewEv(null)}>
          <div style={{background:'#1c1c22',border:`1px solid ${BORDER}`,borderRadius:'12px',width:'100%',maxWidth:'440px'}}
            onClick={e=>e.stopPropagation()}>
            <div style={{padding:'16px 24px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                <div style={{width:'10px',height:'10px',borderRadius:'50%',background:TYPE_COLOR[viewEv.event_type],flexShrink:0}}/>
                <span style={{fontSize:'11px',fontWeight:600,color:TYPE_COLOR[viewEv.event_type],textTransform:'uppercase',letterSpacing:'1px'}}>{TYPE_LABEL[viewEv.event_type]}</span>
              </div>
              <button onClick={()=>setViewEv(null)} style={{background:'none',border:'none',color:TEXT_S,cursor:'pointer',fontSize:'20px',lineHeight:1}}>×</button>
            </div>
            <div style={{padding:'24px'}}>
              <h3 style={{fontFamily:FONT,fontWeight:700,fontSize:'18px',color:TEXT_P,marginBottom:'20px',lineHeight:1.3}}>{viewEv.title}</h3>
              <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'24px'}}>
                <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                  <span style={{fontSize:'11px',color:TEXT_S,width:'68px',flexShrink:0,fontWeight:500}}>📅 Data</span>
                  <span style={{fontSize:'13px',color:TEXT_P}}>{fd(viewEv.event_date)}</span>
                </div>
                {viewEv.event_time&&(
                  <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                    <span style={{fontSize:'11px',color:TEXT_S,width:'68px',flexShrink:0,fontWeight:500}}>⏰ Horário</span>
                    <span style={{fontSize:'13px',color:TEXT_P}}>{ft(viewEv.event_time)}</span>
                  </div>
                )}
                {viewEv.notes&&(
                  <div style={{display:'flex',gap:'12px',alignItems:'flex-start'}}>
                    <span style={{fontSize:'11px',color:TEXT_S,width:'68px',flexShrink:0,fontWeight:500,paddingTop:'2px'}}>📝 Notas</span>
                    <span style={{fontSize:'13px',color:TEXT_P,lineHeight:1.6,flex:1}}>{viewEv.notes}</span>
                  </div>
                )}
              </div>
              <div style={{display:'flex',justifyContent:'flex-end',gap:'10px'}}>
                <button onClick={()=>setViewEv(null)} style={{padding:'8px 16px',borderRadius:'8px',border:`1px solid ${BORDER}`,background:'transparent',color:TEXT_S,cursor:'pointer',fontSize:'13px',fontFamily:FONT}}>Fechar</button>
                <button onClick={()=>{setViewEv(null);openEdit(viewEv)}} style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:PRIMARY,color:'#000',cursor:'pointer',fontSize:'13px',fontWeight:600,fontFamily:FONT}}>✏️ Editar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.8)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,padding:'20px'}}>
          <div style={{background:'#1c1c22',border:`1px solid ${BORDER}`,borderRadius:'12px',width:'100%',maxWidth:'460px'}}>
            <div style={{padding:'20px 24px',borderBottom:`1px solid ${BORDER}`,display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <h3 style={{fontFamily:FONT,fontWeight:700,fontSize:'16px',color:TEXT_P}}>{editing?'Editar Evento':'Novo Evento'}</h3>
              <button onClick={()=>setShowModal(false)} style={{background:'none',border:'none',color:TEXT_S,cursor:'pointer',fontSize:'20px'}}>×</button>
            </div>
            <div style={{padding:'24px'}}>
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'11px',color:TEXT_S,textTransform:'uppercase',letterSpacing:'1px',marginBottom:'6px',fontWeight:600}}>Título *</label>
                <input style={INP} value={form.title||''} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Nome do evento..." autoFocus/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'12px'}}>
                <div>
                  <label style={{display:'block',fontSize:'11px',color:TEXT_S,textTransform:'uppercase' as const,letterSpacing:'1px',marginBottom:'6px',fontWeight:600}}>Data *</label>
                  <input type="date" style={INP} value={form.event_date||''} onChange={e=>setForm(p=>({...p,event_date:e.target.value}))}/>
                </div>
                <div>
                  <label style={{display:'block',fontSize:'11px',color:TEXT_S,textTransform:'uppercase' as const,letterSpacing:'1px',marginBottom:'6px',fontWeight:600}}>Horário</label>
                  <input type="time" style={INP} value={form.event_time||''} onChange={e=>setForm(p=>({...p,event_time:e.target.value}))}/>
                </div>
              </div>
              <div style={{marginBottom:'12px'}}>
                <label style={{display:'block',fontSize:'11px',color:TEXT_S,textTransform:'uppercase' as const,letterSpacing:'1px',marginBottom:'6px',fontWeight:600}}>Tipo</label>
                <select style={{...INP}} value={form.event_type||'manual'} onChange={e=>setForm(p=>({...p,event_type:e.target.value as CalEvent['event_type']}))}>
                  <option value="manual">Evento</option>
                  <option value="reuniao">Reunião</option>
                  <option value="capt">Captação</option>
                  <option value="entrega">Entrega</option>
                  <option value="fixo">Fixo</option>
                </select>
              </div>
              <div style={{marginBottom:'20px'}}>
                <label style={{display:'block',fontSize:'11px',color:TEXT_S,textTransform:'uppercase' as const,letterSpacing:'1px',marginBottom:'6px',fontWeight:600}}>Observações</label>
                <textarea style={{...INP,resize:'vertical',minHeight:'64px'}} value={form.notes||''} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Detalhes do evento..."/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
                {editing
                  ?<button onClick={()=>handleDelete(editing.id)} style={{padding:'7px 12px',borderRadius:'8px',border:'none',background:'rgba(232,93,74,.12)',color:'#e85d4a',cursor:'pointer',fontSize:'12px',fontFamily:FONT}}>🗑 Excluir</button>
                  :<div/>
                }
                <div style={{display:'flex',gap:'10px'}}>
                  <button onClick={()=>setShowModal(false)} style={{padding:'8px 16px',borderRadius:'8px',border:`1px solid ${BORDER}`,background:'transparent',color:TEXT_S,cursor:'pointer',fontSize:'13px',fontFamily:FONT}}>Cancelar</button>
                  <button onClick={handleSave} disabled={saving} style={{padding:'8px 16px',borderRadius:'8px',border:'none',background:PRIMARY,color:'#000',cursor:'pointer',fontSize:'13px',fontWeight:600,fontFamily:FONT}}>{saving?'Salvando...':editing?'Salvar':'Criar evento'}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
