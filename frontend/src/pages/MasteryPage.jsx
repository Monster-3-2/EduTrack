import { useState, useEffect } from 'react'
import { Award, Plus, Trash2, ChevronDown, ChevronUp, Zap, RotateCcw, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

const API = import.meta.env.VITE_API_URL || ''

// ── Calls your backend → backend uses GROQ_API_KEY from Render env ─
async function generateMCQ(subject, topic) {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(`${API}/api/quiz/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ subject, topic }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`)
  if (!Array.isArray(data.questions)) throw new Error('Invalid response from server')
  return data.questions
}

// ── History item ───────────────────────────────────────────────────
function HistoryItem({ result }) {
  const [open, setOpen] = useState(false)
  const pct    = Math.round((result.score / result.total) * 100)
  const col    = pct >= 70 ? '#4fd1c5' : pct >= 40 ? '#ffd700' : '#ff5e5e'
  const bgCol  = pct >= 70 ? 'rgba(79,209,197,0.08)'  : pct >= 40 ? 'rgba(255,215,0,0.08)'  : 'rgba(255,94,94,0.08)'
  const brdCol = pct >= 70 ? 'rgba(79,209,197,0.2)'   : pct >= 40 ? 'rgba(255,215,0,0.2)'   : 'rgba(255,94,94,0.2)'

  return (
    <div className="glass-card overflow-hidden rounded-xl">
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen(!open)}>
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
          style={{ color: col, border: `1px solid ${brdCol}`, background: bgCol }}>
          {result.score}/{result.total}
        </div>
        <div className="flex-1">
          <p className="text-white text-sm">{result.subtopics?.name || 'Topic'}</p>
          <p className="text-white/40 text-xs">{new Date(result.created_at).toLocaleDateString()}</p>
        </div>
        <span className="text-xs px-2 py-1 rounded-full"
          style={{ color: col, background: bgCol, border: `1px solid ${brdCol}` }}>
          {pct}%
        </span>
        {open ? <ChevronUp size={14} className="text-white/40" /> : <ChevronDown size={14} className="text-white/40" />}
      </button>

      {open && result.questions && (
        <div className="px-4 pb-4 border-t border-white/10 space-y-3 pt-3">
          {result.questions.map((q, i) => (
            <div key={i}>
              <p className="text-white text-sm font-medium mb-2">{i + 1}. {q.question}</p>
              <div className="grid grid-cols-2 gap-1">
                {q.options.map((opt, j) => (
                  <div key={j} className="text-xs px-2 py-1 rounded-lg"
                    style={j === q.correct
                      ? { background: 'rgba(79,209,197,0.15)', color: '#4fd1c5', border: '1px solid rgba(79,209,197,0.2)' }
                      : { color: 'rgba(255,255,255,0.35)', border: '1px solid rgba(255,255,255,0.05)' }}>
                    {j === q.correct && '✓ '}{opt}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ──────────────────────────────────────────────────────
export default function MasteryPage() {
  const [tab, setTab]               = useState('quiz')
  const [subjects, setSubjects]     = useState([])
  const [subtopics, setSubtopics]   = useState([])
  const [subjectId, setSubjectId]   = useState('')
  const [subtopicId, setSubtopicId] = useState('')
  const [loading, setLoading]       = useState(true)

  const [questions, setQuestions]   = useState([])
  const [answers, setAnswers]       = useState({})
  const [submitted, setSubmitted]   = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genError, setGenError]     = useState('')
  const [saveMsg, setSaveMsg]       = useState('')

  const [history, setHistory] = useState([])
  const [jargon, setJargon]   = useState([])
  const [word, setWord]       = useState('')
  const [def, setDef]         = useState('')

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user.id)
      setSubjects(subs || [])
      if (subs?.length) { setSubjectId(String(subs[0].id)); await loadSubtopics(subs[0].id) }
      setLoading(false)
    }
    load()
  }, [])

  const loadSubtopics = async (sid) => {
    const { data } = await supabase.from('subtopics').select('*').eq('subject_id', sid)
    setSubtopics(data || [])
    if (data?.length) setSubtopicId(String(data[0].id))
  }

  const loadHistory = async () => {
    const { data } = await supabase.from('quiz_results')
      .select('*, subtopics(name)').order('created_at', { ascending: false }).limit(30)
    setHistory(data || [])
  }

  const loadJargon = async (sid) => {
    const { data } = await supabase.from('jargon_words').select('*')
      .eq('subject_id', sid).order('created_at', { ascending: false })
    setJargon(data || [])
  }

  useEffect(() => { if (tab === 'history') loadHistory() }, [tab])
  useEffect(() => { if (tab === 'jargon' && subjectId) loadJargon(subjectId) }, [tab, subjectId])

  const currentSubject = subjects.find(s => String(s.id) === subjectId)
  const currentTopic   = subtopics.find(s => String(s.id) === subtopicId)

  const handleReset = () => {
    setQuestions([]); setAnswers({}); setSubmitted(false); setSaveMsg(''); setGenError('')
  }

  const handleGenerate = async () => {
    if (!currentSubject || !currentTopic) { setGenError('Select a subject and topic.'); return }
    setGenerating(true); setGenError(''); setQuestions([]); setAnswers({}); setSubmitted(false); setSaveMsg('')
    try {
      const qs = await generateMCQ(currentSubject.name, currentTopic.name)
      setQuestions(qs)
    } catch (e) {
      setGenError(e.message || 'Failed to generate quiz.')
    } finally {
      setGenerating(false)
    }
  }

  const handleAnswer = (qIdx, choiceIdx) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: choiceIdx }))
  }

  const score = questions.reduce((acc, q, i) => acc + (answers[i] === q.correct ? 1 : 0), 0)
  const allAnswered = questions.length > 0 && Object.keys(answers).length === questions.length

  const handleSubmit = async () => {
    if (!allAnswered) return
    setSubmitted(true)
    try {
      await supabase.from('quiz_results').insert({
        subtopic_id: +subtopicId, score, total: questions.length, questions,
      })
      setSaveMsg('Result saved!')
    } catch { setSaveMsg('Could not save result.') }
  }

  const pct = questions.length ? Math.round((score / questions.length) * 100) : 0

  const chartData = history
    .filter(h => String(h.subtopic_id) === subtopicId).reverse()
    .map((h, i) => ({ s: `#${i + 1}`, score: Math.round((h.score / h.total) * 100) }))

  const addJargon = async () => {
    if (!word || !def || !subjectId) return
    const { data } = await supabase.from('jargon_words')
      .insert({ subject_id: +subjectId, word, plain_definition: def }).select().single()
    setJargon(p => [data, ...p]); setWord(''); setDef('')
  }

  const deleteJargon = async (id) => {
    await supabase.from('jargon_words').delete().eq('id', id)
    setJargon(p => p.filter(j => j.id !== id))
  }

  const TABS = [
    { key: 'quiz',    label: '⚡ Quiz Mode' },
    { key: 'history', label: '📈 Progress'  },
    { key: 'jargon',  label: '📖 Jargon'    },
  ]

  return (
    <div className="px-8 lg:px-20 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="orbitron text-5xl uppercase tracking-tighter mb-2">Mastery Proof</h1>
        <p className="text-[#A0A0A0] text-sm tracking-wider">Test yourself. Fresh Groq-generated questions every time.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-xl"
        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm transition-all ${tab === t.key ? 'tab-active' : 'tab-inactive'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>

      ) : tab === 'quiz' ? (
        <div className="space-y-4">
          {/* Subject + Topic */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/40 text-xs block mb-1">Subject</label>
              <select className="input" value={subjectId}
                onChange={e => { setSubjectId(e.target.value); loadSubtopics(+e.target.value); handleReset() }}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Topic</label>
              <select className="input" value={subtopicId}
                onChange={e => { setSubtopicId(e.target.value); handleReset() }}>
                {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {/* Generate button */}
          {questions.length === 0 && !generating && (
            <button onClick={handleGenerate}
              className="btn-primary w-full justify-center flex items-center gap-2 py-3 text-base">
              <Zap size={16} />
              Generate 5 Questions on "{currentTopic?.name || '—'}"
            </button>
          )}

          {genError && (
            <div className="rounded-xl px-4 py-3 text-sm"
              style={{ background: 'rgba(255,94,94,0.1)', border: '1px solid rgba(255,94,94,0.2)', color: '#ff5e5e' }}>
              ⚠ {genError}
            </div>
          )}

          {generating && (
            <div className="glass-card rounded-xl p-10 flex flex-col items-center gap-4">
              <div className="w-10 h-10 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <p className="text-white/60 text-sm tracking-wider">Groq is generating your quiz…</p>
            </div>
          )}

          {/* Questions */}
          {questions.length > 0 && (
            <div className="space-y-4">
              {questions.map((q, qi) => {
                const chosen  = answers[qi]
                const isRight = submitted && chosen === q.correct
                const isWrong = submitted && chosen !== undefined && chosen !== q.correct
                return (
                  <div key={qi} className="glass-card rounded-xl p-5">
                    <div className="flex items-start gap-3 mb-4">
                      <span className="orbitron text-xs text-white/40 mt-0.5 shrink-0">Q{qi + 1}</span>
                      <p className="text-white text-sm leading-relaxed font-medium flex-1">{q.question}</p>
                      {submitted && (isRight
                        ? <CheckCircle size={18} className="shrink-0 mt-0.5" style={{ color: '#4fd1c5' }} />
                        : <XCircle    size={18} className="shrink-0 mt-0.5" style={{ color: '#ff5e5e' }} />
                      )}
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {q.options.map((opt, oi) => {
                        const isChosen  = answers[qi] === oi
                        const isCorrect = submitted && oi === q.correct
                        const isMyWrong = submitted && isChosen && oi !== q.correct
                        return (
                          <button key={oi} onClick={() => handleAnswer(qi, oi)} disabled={submitted}
                            className="w-full text-left px-4 py-3 rounded-xl text-sm transition-all"
                            style={
                              isCorrect  ? { background: 'rgba(79,209,197,0.12)', border: '1px solid rgba(79,209,197,0.4)', color: '#4fd1c5', cursor: 'default' }
                            : isMyWrong ? { background: 'rgba(255,94,94,0.12)',  border: '1px solid rgba(255,94,94,0.4)',  color: '#ff5e5e', cursor: 'default' }
                            : isChosen  ? { background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.8)', color: '#fff' }
                            :             { background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.6)' }
                            }>
                            <span className="orbitron text-xs mr-3 opacity-50">{String.fromCharCode(65 + oi)}.</span>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                    {submitted && q.explanation && (
                      <div className="mt-3 px-3 py-2 rounded-lg text-xs leading-relaxed"
                        style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.55)' }}>
                        💡 {q.explanation}
                      </div>
                    )}
                  </div>
                )
              })}

              {!submitted ? (
                <button onClick={handleSubmit} disabled={!allAnswered}
                  className="btn-primary w-full justify-center flex items-center gap-2 py-3 text-base">
                  Submit Quiz ({Object.keys(answers).length}/{questions.length} answered)
                </button>
              ) : (
                <div className="rounded-xl px-6 py-5 flex items-center justify-between"
                  style={pct >= 70
                    ? { background: 'rgba(79,209,197,0.1)',  border: '1px solid rgba(79,209,197,0.25)' }
                    : pct >= 40
                    ? { background: 'rgba(255,215,0,0.1)',   border: '1px solid rgba(255,215,0,0.25)'  }
                    : { background: 'rgba(255,94,94,0.1)',   border: '1px solid rgba(255,94,94,0.25)'  }}>
                  <div>
                    <p className="orbitron text-2xl font-bold"
                      style={{ color: pct >= 70 ? '#4fd1c5' : pct >= 40 ? '#ffd700' : '#ff5e5e' }}>
                      {score} / {questions.length}
                    </p>
                    <p className="text-white/50 text-xs mt-1">
                      {pct >= 70 ? '🎉 Excellent mastery!' : pct >= 40 ? '👍 Getting there — retry the misses' : '📚 Keep studying and try again'}
                    </p>
                    {saveMsg && <p className="text-white/40 text-xs mt-1">{saveMsg}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Award size={28} style={{ color: pct >= 70 ? '#4fd1c5' : pct >= 40 ? '#ffd700' : '#ff5e5e' }} />
                    <button onClick={handleGenerate}
                      className="flex items-center gap-1 text-xs text-white/50 hover:text-white transition-colors">
                      <RotateCcw size={12} /> New quiz
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      ) : tab === 'history' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-white/40 text-xs block mb-1">Subject</label>
              <select className="input" value={subjectId}
                onChange={e => { setSubjectId(e.target.value); loadSubtopics(+e.target.value) }}>
                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-white/40 text-xs block mb-1">Topic</label>
              <select className="input" value={subtopicId} onChange={e => setSubtopicId(e.target.value)}>
                {subtopics.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>

          {chartData.length > 1 && (
            <div className="glass-card rounded-xl p-5">
              <h3 className="text-white text-sm font-semibold mb-3">Score % Over Time</h3>
              <ResponsiveContainer width="100%" height={130}>
                <LineChart data={chartData}>
                  <XAxis dataKey="s" tick={{ fill: '#6b6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 100]} tick={{ fill: '#6b6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 10 }}
                    formatter={(v) => [`${v}%`, 'Score']} />
                  <Line type="monotone" dataKey="score" stroke="#7c6aff" strokeWidth={2.5} dot={{ fill: '#7c6aff', r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {history.length === 0 ? (
            <div className="glass-card rounded-xl p-10 text-center">
              <Zap size={32} className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.15)' }} />
              <p className="text-[#A0A0A0] text-sm tracking-wider">No quizzes yet. Generate one in Quiz Mode!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(r => <HistoryItem key={r.id} result={r} />)}
            </div>
          )}
        </div>

      ) : (
        <div className="space-y-4">
          <select className="input" value={subjectId}
            onChange={e => { setSubjectId(e.target.value); loadJargon(+e.target.value) }}>
            {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          <div className="glass-card rounded-xl p-5 space-y-3">
            <h3 className="text-white text-sm font-semibold flex items-center gap-2">
              <Plus size={14} /> Add Jargon Word
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <input className="input" placeholder="Technical word" value={word} onChange={e => setWord(e.target.value)} />
              <input className="input" placeholder="Plain English meaning" value={def} onChange={e => setDef(e.target.value)} />
            </div>
            <button onClick={addJargon} disabled={!word || !def} className="btn-primary text-sm">Add to Dictionary</button>
          </div>

          {jargon.length === 0 ? (
            <div className="glass-card rounded-xl p-8 text-center">
              <p className="text-[#A0A0A0] text-sm tracking-wider">No jargon words yet.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {jargon.map(j => (
                <div key={j.id} className="glass-card rounded-xl p-4 flex items-start gap-3 group">
                  <div className="flex-1">
                    <p className="text-white text-sm font-semibold">{j.word}</p>
                    <p className="text-white/60 text-sm mt-0.5">{j.plain_definition}</p>
                  </div>
                  <button onClick={() => deleteJargon(j.id)}
                    className="opacity-0 group-hover:opacity-100 transition-all" style={{ color: '#ff5e5e' }}>
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
