// Dashboard — exact site.html UI, wired to real Supabase backend (all logic from original Dashboard.jsx)
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

function AddModal({ onClose, onAdd }) {
  const [name, setName]       = useState('')
  const [date, setDate]       = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase.from('subjects')
      .insert({ name, exam_date: date || null, user_id: user.id, readiness_score: 0 })
      .select().single()
    setLoading(false)
    if (!error) { onAdd(data); onClose() }
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.85)', backdropFilter:'blur(8px)', zIndex:50, display:'flex', alignItems:'center', justifyContent:'center', padding:24 }}>
      <div className="glass-card p-8 rounded-2xl" style={{ width:'100%', maxWidth:420 }}>
        <h3 className="orbitron text-lg uppercase tracking-widest text-white mb-6">ADD_SUBJECT</h3>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Subject Name</label>
            <input className="input" placeholder="e.g. Organic Chemistry" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Exam Date (optional)</label>
            <input type="date" className="input" value={date} onChange={e => setDate(e.target.value)} />
          </div>
          <div style={{ display:'flex', gap:12, paddingTop:4 }}>
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">CANCEL</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'ADDING…' : 'INJECT →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { user }                = useAuth()
  const [subjects, setSubjects] = useState([])
  const [dueCount, setDueCount] = useState(0)
  const [showAdd, setShowAdd]   = useState(false)
  const [loading, setLoading]   = useState(true)

  const name     = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'
  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data: { user: u } } = await supabase.auth.getUser()
    const { data: subs } = await supabase.from('subjects').select('*')
      .eq('user_id', u.id).order('created_at', { ascending: false })
    setSubjects(subs || [])
    const today = new Date().toISOString().split('T')[0]
    const { count } = await supabase.from('recall_sessions')
      .select('*', { count: 'exact', head: true }).lte('next_review_date', today)
    setDueCount(count || 0)
    setLoading(false)
  }

  const deleteSubject = async (id) => {
    await supabase.from('subjects').delete().eq('id', id)
    setSubjects(p => p.filter(s => s.id !== id))
  }

  const avgReadiness = subjects.length
    ? Math.round(subjects.reduce((s, sub) => s + (sub.readiness_score || 0), 0) / subjects.length)
    : 0

  const circumference = 2 * Math.PI * 45

  return (
    <div className="px-8 lg:px-20 max-w-7xl mx-auto">
      {/* Header */}
      <section className="mb-20">
        <h1 className="text-6xl font-bold orbitron uppercase tracking-tighter mb-4">
          {greeting}, {name.split(' ')[0]}!
        </h1>
        <div className="flex items-center gap-4 text-[10px] tracking-[0.3em] text-[#A0A0A0] orbitron">
          <span>SYSTEM STATUS: OPTIMAL</span>
          <span className="opacity-30">|</span>
          <span>PRECISION TRACKING ACTIVE</span>
        </div>
      </section>

      {/* Stat modules */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {[
          { mod: 'MODULE_01', label: 'Subjects',      val: subjects.length, type: 'num' },
          { mod: 'MODULE_02', label: 'Due Today',     val: dueCount,        type: 'dot' },
          { mod: 'MODULE_03', label: 'Avg Readiness', val: `${avgReadiness}%`, type: 'dot2' },
        ].map(({ mod, label, val, type }) => (
          <div key={mod} className="glass-card p-6 rounded-xl relative overflow-hidden">
            <span className="text-[10px] text-[#A0A0A0] tracking-widest block mb-4 orbitron">{mod}</span>
            <div className="flex justify-between items-end">
              <span className="text-lg orbitron uppercase">{label}</span>
              {type === 'num'
                ? <span className="text-6xl font-bold orbitron">{val}</span>
                : <div className="w-10 h-10 border border-white/20 flex items-center justify-center">
                    <div className={`w-6 h-6 border-2 border-white/40 ${type === 'dot' ? 'transform rotate-45' : ''}`} />
                  </div>
              }
            </div>
          </div>
        ))}
      </section>

      {/* Due today alert */}
      {dueCount > 0 && (
        <div className="glass-card p-4 rounded-xl mb-8 flex items-center justify-between">
          <span className="text-sm orbitron uppercase text-[#A0A0A0] tracking-wider">
            ⚠ <span className="text-white">{dueCount} topic{dueCount>1?'s':''}</span> due for memory review
          </span>
          <Link to="/memory" className="btn-primary text-[10px]" style={{ borderRadius:4, padding:'6px 16px' }}>REVIEW →</Link>
        </div>
      )}

      {/* Academic core */}
      <section className="mb-24">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-sm tracking-[0.2em] orbitron uppercase">Academic Core</h2>
          <button
            onClick={() => setShowAdd(true)}
            className="text-[10px] tracking-widest border border-white/20 px-4 py-2 hover:bg-white hover:text-black transition-all rounded-full glass-card orbitron">
            + ADD_SUBJECT
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1,2].map(i => <div key={i} className="glass-card h-36 rounded-2xl animate-pulse" />)}
          </div>
        ) : subjects.length === 0 ? (
          <div className="glass-card p-12 rounded-2xl text-center">
            <p className="orbitron text-2xl uppercase tracking-tighter mb-4">NO SUBJECTS LOADED</p>
            <p className="text-[#A0A0A0] text-sm mb-8">Inject your first subject to begin tracking.</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary">+ INJECT SUBJECT</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {subjects.map((s, idx) => {
              const score = s.readiness_score || 0
              const offset = circumference - (score / 100) * circumference
              const days = s.exam_date
                ? Math.ceil((new Date(s.exam_date) - new Date()) / 86400000)
                : null
              return (
                <div key={s.id} className="glass-card p-8 flex items-center gap-8 rounded-2xl relative overflow-hidden">
                  <div className="progress-ring">
                    <svg height="100" width="100">
                      <circle className="bg" cx="50" cy="50" r="45" />
                      <circle className="bar" cx="50" cy="50" r="45"
                        strokeDasharray={circumference}
                        strokeDashoffset={offset} />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-lg font-bold orbitron">{score}%</span>
                    </div>
                  </div>
                  <div className="flex-1">
                    <span className="text-[9px] text-[#A0A0A0] tracking-widest orbitron">[ COURSE_ID: {`C_${String(idx+1).padStart(3,'0')}`} ]</span>
                    <h3 className="text-3xl font-bold orbitron mt-1 mb-1">{s.name}</h3>
                    {days !== null && (
                      <p className="text-[10px] orbitron uppercase tracking-wider mb-3"
                        style={{ color: days <= 7 ? '#ff5e5e' : '#A0A0A0' }}>
                        {days > 0 ? `EXAM IN ${days} DAYS` : 'EXAM PASSED'}
                      </p>
                    )}
                    <div className="flex gap-3 mt-4">
                      <Link to={`/subject/${s.id}`}
                        className="bg-white text-black px-8 py-2 text-[10px] tracking-[0.3em] font-bold hover:bg-gray-200 rounded-full transition-transform hover:scale-105 active:scale-95 orbitron">
                        OPEN
                      </Link>
                      <button onClick={() => deleteSubject(s.id)}
                        className="text-[10px] tracking-widest border border-white/20 px-4 py-2 hover:bg-white/10 rounded-full orbitron text-white/40 hover:text-white transition-all">
                        DEL
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {showAdd && <AddModal onClose={() => setShowAdd(false)} onAdd={s => setSubjects(p => [s,...p])} />}
    </div>
  )
}
