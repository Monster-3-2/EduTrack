import { useState, useEffect } from 'react'
import { Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

function sm2(score, ef, interval, reps) {
  const q = Math.round(score / 20)
  if (q < 3) return { interval: 1, ef: Math.max(1.3, ef - 0.2), reps: 0 }
  const newInterval = reps === 0 ? 1 : reps === 1 ? 6 : Math.round(interval * ef)
  const newEf = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  const nextDate = new Date()
  nextDate.setDate(nextDate.getDate() + newInterval)
  return { interval: newInterval, ef: newEf, reps: reps + 1, nextDate: nextDate.toISOString().split('T')[0] }
}

function RecallCard({ item, onDone }) {
  const [phase, setPhase]         = useState('predict')
  const [predicted, setPredicted] = useState(70)
  const [actual, setActual]       = useState(70)
  const [saving, setSaving]       = useState(false)

  const save = async () => {
    setSaving(true)
    const { data: last } = await supabase.from('recall_sessions')
      .select('ease_factor, interval_days, repetitions')
      .eq('subtopic_id', item.subtopic_id)
      .order('session_date', { ascending: false })
      .limit(1).single()
    const prev = last || { ease_factor: 2.5, interval_days: 1, repetitions: 0 }
    const result = sm2(actual, prev.ease_factor, prev.interval_days, prev.repetitions)
    await supabase.from('recall_sessions').insert({
      subtopic_id: item.subtopic_id,
      predicted_score: predicted, actual_score: actual,
      next_review_date: result.nextDate, interval_days: result.interval,
      ease_factor: result.ef, repetitions: result.reps
    })
    setSaving(false)
    onDone({ predicted, actual, nextDate: result.nextDate })
  }

  return (
    <div className="glass-card p-8 rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="orbitron text-xl uppercase tracking-tight text-white">{item.subtopics?.name}</h3>
        <span className="text-[10px] text-[#A0A0A0] orbitron uppercase">{item.subtopics?.subjects?.name}</span>
      </div>

      {phase === 'predict' && (
        <>
          <p className="text-[#A0A0A0] text-sm mb-6 orbitron uppercase tracking-wider">Confidence check — how much will you remember?</p>
          <div className="flex items-center gap-6 mb-8">
            <input type="range" min="0" max="100" value={predicted} onChange={e => setPredicted(+e.target.value)} className="flex-1" style={{ accentColor:'white' }} />
            <span className="orbitron text-3xl font-bold w-16 text-right">{predicted}%</span>
          </div>
          <button onClick={() => setPhase('recall')} className="btn-primary w-full justify-center" style={{ borderRadius:4 }}>
            SET PREDICTION → START RECALL
          </button>
        </>
      )}

      {phase === 'recall' && (
        <>
          <div className="border border-white/10 rounded-lg p-6 mb-6">
            <p className="text-[#A0A0A0] text-sm">Recall everything you know about <strong className="text-white orbitron">{item.subtopics?.name}</strong> from memory. Write it down or say it out loud. Take 2–3 minutes.</p>
          </div>
          <button onClick={() => setPhase('rate')} className="btn-primary w-full justify-center" style={{ borderRadius:4 }}>DONE — RATE MY RECALL</button>
        </>
      )}

      {phase === 'rate' && (
        <>
          <p className="text-[#A0A0A0] text-sm mb-4 orbitron uppercase tracking-wider">How well did you actually recall?</p>
          <div className="flex items-center gap-6 mb-4">
            <input type="range" min="0" max="100" value={actual} onChange={e => setActual(+e.target.value)} className="flex-1" style={{ accentColor:'white' }} />
            <span className="orbitron text-3xl font-bold w-16 text-right"
              style={{ color: actual>=70 ? '#4fd1c5' : actual>=40 ? '#ffd700' : '#ff5e5e' }}>{actual}%</span>
          </div>
          {Math.abs(actual - predicted) > 20 && (
            <div className="border border-white/20 rounded px-4 py-2 mb-4 text-xs orbitron uppercase tracking-wider text-[#A0A0A0]">
              {actual > predicted ? '↑ You knew more than expected' : '↓ Overconfident — noted'}
            </div>
          )}
          <button onClick={save} disabled={saving} className="btn-primary w-full justify-center" style={{ borderRadius:4 }}>
            {saving ? 'SAVING…' : 'LOG SESSION'}
          </button>
        </>
      )}
    </div>
  )
}

export default function MemoryPage() {
  const [tab, setTab]           = useState('review')
  const [dueItems, setDueItems] = useState([])
  const [mistakes, setMistakes] = useState([])
  const [done, setDone]         = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    const today = new Date().toISOString().split('T')[0]
    const { data: due } = await supabase.from('recall_sessions')
      .select('id, subtopic_id, next_review_date, subtopics(name, subjects(name))')
      .lte('next_review_date', today).order('next_review_date')
    const seen = new Set()
    const deduped = (due || []).filter(d => { if (seen.has(d.subtopic_id)) return false; seen.add(d.subtopic_id); return true })
    setDueItems(deduped)
    const { data: mis } = await supabase.from('recall_sessions')
      .select('id, actual_score, session_date, subtopics(name, subjects(name))')
      .lt('actual_score', 50).order('session_date', { ascending: false }).limit(20)
    setMistakes(mis || [])
    setLoading(false)
  }

  const handleDone = (itemId, result) => {
    setDone(p => [...p, result])
    setDueItems(p => p.filter(d => d.id !== itemId))
  }

  return (
    <div className="px-8 lg:px-20 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-20">
        <h1 className="orbitron text-6xl uppercase tracking-tighter">Memory Engine</h1>
        <div className="h-px w-full max-w-2xl bg-gradient-to-r from-white/40 to-transparent mt-4" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
        {/* Stats column */}
        <div className="md:col-span-3 space-y-6">
          {[
            { label: 'DUE TODAY', val: dueItems.length, module:'01' },
            { label: 'REVIEWED',  val: done.length,     module:'02' },
            { label: 'MISTAKES',  val: mistakes.length, module:'03', err: true },
          ].map((stat) => (
            <div key={stat.label} className={`border-l-2 ${stat.err ? 'border-red-500/40 hover:border-red-500' : 'border-white/20 hover:border-white'} pl-6 py-4 transition-all duration-500`}>
              <h3 className={`text-[10px] orbitron tracking-widest mb-2 opacity-50 ${stat.err ? 'text-red-400' : ''}`}>{stat.label}</h3>
              <span className={`orbitron text-3xl ${stat.err ? 'text-red-400' : ''}`}>{stat.val}</span>
              <div className="mt-2 text-[10px] text-white/40 orbitron uppercase">MODULE: {stat.module}</div>
            </div>
          ))}
        </div>

        {/* Main panel */}
        <div className="md:col-span-6">
          {/* Tabs */}
          <div className="flex gap-8 border-b border-white/10 pb-4 mb-8">
            {[
              { key:'review',   label:`REVIEW (${dueItems.length})` },
              { key:'mistakes', label:`MISTAKES (${mistakes.length})` },
            ].map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`orbitron text-xs relative ${tab===t.key ? 'text-white' : 'text-white/40 hover:text-white'} transition-colors`}>
                {t.label}
                {tab===t.key && <span className="absolute -bottom-5 left-0 w-full h-0.5 bg-white" />}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="glass-card py-24 rounded-2xl flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : tab === 'review' ? (
            dueItems.length === 0 ? (
              <div className="glass-card py-24 rounded-2xl flex flex-col items-center text-center">
                <div className="mb-8 p-6 rounded-full border border-white/10 bg-black/40 shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                  <span className="material-symbols-outlined text-[64px] font-light animate-pulse">verified</span>
                </div>
                <h2 className="orbitron text-2xl tracking-tight mb-4">ALL CAUGHT UP!</h2>
                <p className="text-white/50 max-w-sm mb-10 text-sm">No pending reviews detected.</p>
              </div>
            ) : (
              <RecallCard key={dueItems[0].id} item={dueItems[0]}
                onDone={(r) => handleDone(dueItems[0].id, r)} />
            )
          ) : (
            <div className="space-y-3">
              {mistakes.length === 0 ? (
                <div className="glass-card p-10 rounded-2xl text-center">
                  <p className="text-white/50 text-sm orbitron uppercase">No mistakes logged yet.</p>
                </div>
              ) : mistakes.map(m => (
                <div key={m.id} className="glass-card p-4 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/70">{m.subtopics?.name}</p>
                    <p className="text-xs text-[#A0A0A0] orbitron">{m.subtopics?.subjects?.name} · {new Date(m.session_date).toLocaleDateString()}</p>
                  </div>
                  <span className="orbitron text-lg font-bold text-red-400">{m.actual_score}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analytics column */}
        <div className="md:col-span-3 space-y-6">
          <div className="p-8 glass-card rounded-2xl">
            <span className="text-[10px] orbitron uppercase opacity-40 mb-4 block">Engine Analytics</span>
            <h4 className="orbitron text-[10px] tracking-widest mb-6 uppercase">RETENTION_STABILITY</h4>
            <div className="h-24 w-full flex items-end gap-[2px]">
              {[40,55,45,70,60,85,95].map((h,i) => (
                <div key={i} className="flex-1 bg-white/10 transition-all hover:bg-white/40" style={{ height:`${h}%` }} />
              ))}
            </div>
          </div>
          {done.length > 0 && (
            <div className="glass-card p-5 rounded-2xl">
              <h3 className="orbitron text-[10px] tracking-widest text-white/50 uppercase mb-4">REVIEWED TODAY</h3>
              {done.map((d,i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-white/10 last:border-0 text-xs">
                  <span className="text-white/40 orbitron">#{i+1}</span>
                  <span className="orbitron" style={{ color: d.actual>=70?'#4fd1c5':d.actual>=40?'#ffd700':'#ff5e5e' }}>
                    {d.actual}% · next: {d.nextDate}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
