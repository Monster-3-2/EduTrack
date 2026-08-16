// SubjectPage.jsx — retheme to match the Void/HUD system used by Dashboard/Layout.
// All original logic (state, Supabase calls, calculations) unchanged — UI only.
import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Plus, AlertTriangle, Network, ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase'

const STATUS = {
  studied:     { label: 'Studied',     cls: 'badge-studied',     dot: '#4fd1c5' },
  partial:     { label: 'Partial',     cls: 'badge-partial',     dot: '#ffd700' },
  not_started: { label: 'Not Started', cls: 'badge-not_started', dot: '#ff5e5e' },
}
const CYCLE = ['not_started', 'partial', 'studied']

function TopicCard({ topic, onStatus, onDelete }) {
  const cfg  = STATUS[topic.status] || STATUS.not_started
  const next = CYCLE[(CYCLE.indexOf(topic.status) + 1) % 3]
  const [hoverX, setHoverX] = useState(false)

  return (
    <div className="glass-card p-4 rounded-xl">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.dot,
              boxShadow: `0 0 8px ${cfg.dot}80`, flexShrink: 0 }} />
            <span className="orbitron" style={{ color: '#fff', fontSize: 14, fontWeight: 700,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {topic.name}
            </span>
          </div>
          {topic.notes && (
            <p style={{ color: '#A0A0A0', fontSize: 12, lineHeight: 1.5, marginLeft: 16,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {topic.notes}
            </p>
          )}
          {topic.keywords?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2" style={{ marginLeft: 16 }}>
              {topic.keywords.slice(0, 4).map(k => (
                <span key={k} className="exam-badge" style={{ fontSize: 10, padding: '2px 8px' }}>{k}</span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2">
          <button onClick={() => onStatus(topic.id, next)} className={cfg.cls} style={{ whiteSpace: 'nowrap', cursor: 'pointer' }}>
            {cfg.label}
          </button>
          <button
            onClick={() => onDelete(topic.id)}
            onMouseEnter={() => setHoverX(true)}
            onMouseLeave={() => setHoverX(false)}
            style={{ color: hoverX ? '#ff5e5e' : 'rgba(255,255,255,0.25)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s' }}>
            ✕
          </button>
        </div>
      </div>
    </div>
  )
}

function AddTopicModal({ subjectId, onClose, onAdd }) {
  const [name,     setName]     = useState('')
  const [notes,    setNotes]    = useState('')
  const [keywords, setKeywords] = useState('')
  const [loading,  setLoading]  = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const kws = keywords.split(',').map(k => k.trim()).filter(Boolean)
    const { data, error } = await supabase.from('subtopics')
      .insert({ subject_id: subjectId, name, notes, keywords: kws, status: 'not_started' })
      .select().single()
    setLoading(false)
    if (!error) { onAdd(data); onClose() }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(8px)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div className="glass-card p-8 rounded-2xl" style={{ animation: 'fadeUp 0.3s ease-out', width: '100%', maxWidth: 400 }}>
        <h3 className="orbitron text-lg uppercase tracking-widest text-white mb-6">ADD_TOPIC</h3>
        <form onSubmit={submit} className="space-y-5">
          <div>
            <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Topic name</label>
            <input className="input" placeholder="e.g. Nucleophilic Substitution"
              value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div>
            <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Notes (optional)</label>
            <textarea className="input resize-none" rows={3} placeholder="Paste notes or a quick summary…"
              value={notes} onChange={e => setNotes(e.target.value)} />
          </div>
          <div>
            <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Key concepts (comma-separated)</label>
            <input className="input" placeholder="SN1, SN2, carbocation"
              value={keywords} onChange={e => setKeywords(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 12, paddingTop: 4 }}>
            <button type="button" onClick={onClose} className="btn-ghost flex-1 justify-center">CANCEL</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center">
              {loading ? 'ADDING…' : 'ADD →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SubjectPage() {
  const { id }                = useParams()
  const [subject, setSubject] = useState(null)
  const [topics,  setTopics]  = useState([])
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data: sub  } = await supabase.from('subjects').select('*').eq('id', id).single()
      const { data: tops } = await supabase.from('subtopics').select('*').eq('subject_id', id).order('created_at')
      setSubject(sub)
      setTopics(tops || [])
      setLoading(false)
    }
    load()
  }, [id])

  const updateStatus = async (topicId, status) => {
    await supabase.from('subtopics').update({
      status,
      studied_at: status === 'studied' ? new Date().toISOString() : null
    }).eq('id', topicId)
    setTopics(p => p.map(t => t.id === topicId ? { ...t, status } : t))
  }

  const deleteTopic = async (topicId) => {
    await supabase.from('subtopics').delete().eq('id', topicId)
    setTopics(p => p.filter(t => t.id !== topicId))
  }

  if (loading) return (
    <div className="flex justify-center py-20">
      <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!subject) return <div className="text-center py-20 orbitron uppercase tracking-widest text-white/40">Subject not found.</div>

  const total    = topics.length || 1
  const studied  = topics.filter(t => t.status === 'studied').length
  const partial  = topics.filter(t => t.status === 'partial').length
  const notStart = topics.filter(t => t.status === 'not_started').length
  const coverage = Math.round(studied / total * 100)
  const gaps     = topics.filter(t => t.status === 'not_started')
  const days     = subject.exam_date ? Math.ceil((new Date(subject.exam_date) - new Date()) / 86400000) : null

  return (
    <div className="max-w-3xl mx-auto space-y-6 px-4">

      {/* Breadcrumb + header */}
      <div>
        <div className="flex items-center gap-2 text-[10px] mb-3 orbitron uppercase tracking-widest">
          <Link to="/dashboard" className="text-white/40 hover:text-white transition-colors">Dashboard</Link>
          <span className="text-white/20">/</span>
          <span className="text-white">{subject.name}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="orbitron font-bold uppercase tracking-tighter text-white" style={{ fontSize: '2.4rem', lineHeight: 1.1 }}>
              {subject.name}
            </h1>
            {days !== null && (
              <p className="orbitron text-[10px] uppercase tracking-wider mt-2"
                style={{ color: days <= 7 ? '#ff5e5e' : '#A0A0A0' }}>
                {days > 0 ? `Exam in ${days} days` : days === 0 ? 'Exam is today' : 'Exam passed'}
              </p>
            )}
          </div>
          <button onClick={() => setShowAdd(true)} className="btn-primary" style={{ flexShrink: 0 }}>
            <Plus size={14} /> ADD_TOPIC
          </button>
        </div>
      </div>

      {/* Coverage */}
      <div className="glass-card p-6 rounded-xl">
        <div className="flex justify-between items-center mb-4">
          <span className="orbitron text-[10px] uppercase tracking-widest text-white/50">Coverage</span>
          <span className="orbitron font-bold text-white" style={{ fontSize: '1.8rem' }}>{coverage}%</span>
        </div>
        <div style={{ height: 5, background: 'rgba(255,255,255,0.08)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${coverage}%`, background: '#ffffff', transition: 'width 0.4s ease' }} />
        </div>
        <div className="flex gap-6 mt-4 flex-wrap">
          <span className="orbitron text-[11px] uppercase tracking-wider text-teal font-700">{studied} studied</span>
          <span className="orbitron text-[11px] uppercase tracking-wider text-amber font-700">{partial} partial</span>
          <span className="orbitron text-[11px] uppercase tracking-wider text-rose font-700">{notStart} not started</span>
        </div>
      </div>

      {/* Gap alert */}
      {gaps.length > 0 && (
        <div className="glass-card p-4 rounded-xl" style={{ borderColor: 'rgba(255,94,94,0.3)', background: 'rgba(255,94,94,0.04)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} className="text-rose" />
            <span className="orbitron text-[11px] uppercase tracking-widest text-white font-700">Blind Spot Alert</span>
            <span className="orbitron ml-auto text-[10px] font-700 uppercase tracking-wider text-rose"
              style={{ background: 'rgba(255,94,94,0.12)', border: '1px solid rgba(255,94,94,0.3)', borderRadius: 20, padding: '3px 10px' }}>
              {gaps.length} untouched
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {gaps.map(g => (
              <span key={g.id} className="orbitron" style={{ background: 'rgba(255,94,94,0.08)', color: '#ff8a8a',
                border: '1px solid rgba(255,94,94,0.25)', borderRadius: 20, padding: '4px 12px',
                fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                {g.name}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Topics grid */}
      <div>
        <h2 className="orbitron text-[11px] uppercase tracking-widest text-white/50 mb-4 flex items-center gap-2">
          <Network size={14} /> Knowledge Map
        </h2>

        {topics.length === 0 ? (
          <div className="glass-card p-10 rounded-xl text-center">
            <p className="orbitron text-white/60 text-sm mb-6 uppercase tracking-wide">
              Break this subject into subtopics to start tracking.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
              <button onClick={() => setShowAdd(true)} className="btn-primary">ADD_MANUALLY</button>
              <Link to="/syllabus" className="btn-ghost">USE AI SYLLABUS ANALYSER</Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {topics.map(t => (
              <TopicCard key={t.id} topic={t} onStatus={updateStatus} onDelete={deleteTopic} />
            ))}
          </div>
        )}
      </div>

      {/* Quick links */}
      {topics.length > 0 && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { to: '/memory', label: 'Start Memory Session', sub: 'Spaced repetition review', accent: '#ffffff' },
            { to: '/exam',   label: 'Analyse Exam Papers',  sub: 'Find what gets tested',    accent: '#4fd1c5' },
          ].map(({ to, label, sub, accent }) => (
            <Link key={to} to={to} className="glass-card p-4 rounded-xl group flex items-center justify-between">
              <div>
                <p className="orbitron font-700 text-white text-[13px] uppercase tracking-wide">{label}</p>
                <p style={{ color: '#A0A0A0', fontSize: 12, marginTop: 3 }}>{sub}</p>
              </div>
              <ArrowRight size={16} style={{ color: accent, transition: 'transform 0.2s' }}
                className="group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      )}

      {showAdd && <AddTopicModal subjectId={id} onClose={() => setShowAdd(false)} onAdd={t => setTopics(p => [...p, t])} />}
    </div>
  )
}
