import { useState, useEffect, useRef } from 'react'
import { Upload, FileText, AlertTriangle, TrendingUp, SkipForward, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
//updated nothing
const API = import.meta.env.VITE_API_URL || ''

export default function ExamPage() {
  const [subjects, setSubjects]   = useState([])
  const [selected, setSelected]   = useState(null)
  const [papers, setPapers]       = useState([])
  const [keywords, setKeywords]   = useState([])
  const [qTypes, setQTypes]       = useState(null)
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading]     = useState(true)
  const [deleting, setDeleting]   = useState(null)
  const [error, setError]         = useState('')
  const fileRef                   = useRef()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data: subs } = await supabase.from('subjects').select('*').eq('user_id', user.id)
      setSubjects(subs || [])
      if (subs?.length) { setSelected(subs[0]); loadHeatmap(subs[0].id) }
      else setLoading(false)
    }
    load()
  }, [])

  const loadHeatmap = async (subjectId) => {
    setLoading(true)
    setError('')
    try {
      // Load papers list from Supabase
      const { data } = await supabase.from('exam_papers').select('*')
        .eq('subject_id', subjectId).order('year', { ascending: false })
      setPapers(data || [])

      // Load heatmap from backend (uses pdfplumber-extracted text)
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch(`${API}/api/exam/heatmap/${subjectId}`, {
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}
      })
      if (res.ok) {
        const hm = await res.json()
        setKeywords((hm.keywords || []).map(k => [k.word, k.freq]))
        setQTypes(hm.question_types || null)
      }
    } catch (e) {
      setError('Could not load heatmap.')
    }
    setLoading(false)
  }

  const handleSubjectChange = (sub) => {
    setSelected(sub)
    loadHeatmap(sub.id)
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file || !selected) return

    const currentYear = new Date().getFullYear()
    const input = prompt(`Year of this past exam paper? Must be ${currentYear - 1} or earlier.`)
    if (input === null) { e.target.value = ''; return }
    const year = parseInt(input)
    if (isNaN(year) || year >= currentYear) {
      alert(`Please enter a valid past year (${currentYear - 1} or earlier).`)
      e.target.value = ''
      return
    }

    setUploading(true)
    setError('')
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const formData = new FormData()
      formData.append('file', file)
      formData.append('year', year)

      const res = await fetch(`${API}/api/exam/upload/${selected.id}`, {
        method: 'POST',
        headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setError(d.error || 'Upload failed.')
      } else {
        loadHeatmap(selected.id)
      }
    } catch {
      setError('Upload failed — check your connection.')
    }
    setUploading(false)
    e.target.value = ''
  }

  const handleDelete = async (paperId) => {
    if (!confirm('Delete this question paper? This cannot be undone.')) return
    setDeleting(paperId)
    const { data: { session } } = await supabase.auth.getSession()
    await fetch(`${API}/api/exam/papers/${paperId}`, {
      method: 'DELETE',
      headers: session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {},
    })
    setDeleting(null)
    loadHeatmap(selected.id)
  }

  const maxFreq = keywords[0]?.[1] || 1
  const trendData = [...papers].sort((a, b) => a.year - b.year)
    .map(p => ({ year: String(p.year), count: (p.top_keywords || []).length }))

  return (
    <div className="px-8 lg:px-20 max-w-7xl mx-auto space-y-10">
      <div>
        <h1 className="orbitron text-6xl uppercase tracking-tighter mb-2">Exam Intelligence</h1>
        <p className="text-[#A0A0A0] text-sm tracking-wider">Upload past papers. Find what actually gets tested.</p>
      </div>

      {/* Subject tabs */}
      <div className="flex gap-2 flex-wrap">
        {subjects.map(s => (
          <button key={s.id} onClick={() => handleSubjectChange(s)}
            className={`px-4 py-2 rounded-xl text-sm border transition-all ${selected?.id === s.id ? 'bg-accent text-black border-accent' : 'btn-ghost'}`}>
            {s.name}
          </button>
        ))}
      </div>

      {subjects.length === 0 ? (
        <div className="glass-card p-10 text-center">
          <p className="text-[#A0A0A0] text-sm tracking-wider">Add a subject first from Dashboard.</p>
        </div>
      ) : (
        <>
          {/* Upload card */}
          <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="font-display font-700 text-white text-base">Past Papers — {selected?.name}</h2>
                <p className="text-muted text-xs">{papers.length} uploaded</p>
              </div>
              <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary text-sm">
                <Upload size={14} /> {uploading ? 'Uploading…' : 'Upload PDF'}
              </button>
              <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleUpload} />
            </div>

            {error && (
              <div className="mb-3 px-3 py-2 rounded-lg text-xs"
                style={{ background: 'rgba(255,94,94,0.1)', border: '1px solid rgba(255,94,94,0.2)', color: '#ff5e5e' }}>
                ⚠ {error}
              </div>
            )}

            {papers.map(p => (
              <div key={p.id} className="flex items-center gap-3 bg-surface rounded-xl px-4 py-2.5 mb-2 last:mb-0">
                <FileText size={13} className="text-accent" />
                <span className="text-soft text-sm flex-1 truncate">{p.filename}</span>
                <span className="text-xs px-2 py-0.5 rounded-lg font-bold"
                  style={{ background: 'rgba(124,106,255,0.15)', color: '#a259ff' }}>
                  Past {p.year}
                </span>
                <button onClick={() => handleDelete(p.id)} disabled={deleting === p.id}
                  className="ml-1 p-1.5 rounded-lg hover:bg-rose/15 transition-colors"
                  style={{ color: deleting === p.id ? '#444' : '#ff6b8a' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {loading && (
            <div className="flex justify-center py-8">
              <div className="w-7 h-7 border-2 border-accent border-t-transparent rounded-full animate-spin" />
            </div>
          )}

          {!loading && keywords.length > 0 && (
            <>
              {/* Question type split */}
              {qTypes && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Application Questions', val: qTypes.application, color: 'text-amber', sub: 'Calculate, solve, derive',   bar: 'bg-amber' },
                    { label: 'Definition Questions',  val: qTypes.definition,  color: 'text-teal',  sub: 'Define, explain, describe',  bar: 'bg-teal'  },
                  ].map(({ label, val, color, sub, bar }) => (
                    <div key={label} className="glass-card p-5">
                      <p className="text-muted text-xs mb-1">{label}</p>
                      <p className={`font-display font-700 text-2xl ${color}`}>{val}%</p>
                      <p className="text-muted text-xs mt-0.5 mb-3">{sub}</p>
                      <div className="h-1.5 bg-border rounded-full overflow-hidden">
                        <div className={`h-full ${bar} rounded-full`} style={{ width: `${val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Keyword heatmap */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={15} className="text-rose" />
                  <h2 className="font-display font-700 text-white text-base">Keyword Heatmap</h2>
                  <span className="text-muted text-xs ml-auto">Study high-frequency topics first</span>
                </div>
                <div className="space-y-0">
                  {keywords.slice(0, 15).map(([word, freq], i) => {
                    const pct = Math.round(freq / maxFreq * 100)
                    const col = pct > 66 ? '#ff6b8a' : pct > 33 ? '#ffb347' : '#7c6aff'
                    return (
                      <div key={word} className="flex items-center gap-3 py-2 border-b border-border/40 last:border-0">
                        <span className="text-muted text-xs w-5 text-right">{i + 1}</span>
                        <span className="text-soft text-sm flex-1">{word}</span>
                        <div className="w-28 h-1.5 bg-border rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: col }} />
                        </div>
                        <span className="text-xs font-display font-600 w-8 text-right" style={{ color: col }}>{freq}×</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Trend chart */}
              {trendData.length > 1 && (
                <div className="glass-card p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp size={15} className="text-teal" />
                    <h2 className="font-display font-700 text-white text-base">Trend Across Years</h2>
                  </div>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={trendData}>
                      <XAxis dataKey="year" tick={{ fill: '#6b6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#6b6b8a', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 10, fontSize: 12 }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {trendData.map((_, i) => <Cell key={i} fill={i === trendData.length - 1 ? '#7c6aff' : '#2a2a3d'} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Safe to skip */}
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-2">
                  <SkipForward size={15} className="text-teal" />
                  <h2 className="font-display font-700 text-white text-sm">Safe to Deprioritise</h2>
                </div>
                <p className="text-muted text-xs mb-3">Appearing only 1–2× across papers — review these last.</p>
                <div className="flex flex-wrap gap-2">
                  {keywords.filter(([, f]) => f <= 2).slice(0, 10).map(([w]) => (
                    <span key={w} className="text-xs bg-teal/10 text-teal/70 border border-teal/15 px-2.5 py-1 rounded-lg">{w}</span>
                  ))}
                </div>
              </div>
            </>
          )}

          {!loading && papers.length === 0 && (
            <div className="glass-card p-12 text-center">
              <FileText size={36} className="text-accent/30 mx-auto mb-3" />
              <h3 className="font-display font-700 text-white mb-2">No papers yet</h3>
              <p className="text-muted text-sm mb-5">Upload past exam PDFs to unlock keyword heatmaps and pattern analysis.</p>
              <button onClick={() => fileRef.current?.click()} className="btn-primary mx-auto">Upload First Paper</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
