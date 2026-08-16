import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const TARGETS = [
  { key: 'boards', icon: 'school',            label: 'TARGET.01', title: 'BOARDS',  desc: 'High-fidelity analysis of K-12 state & CBSE/ICSE syllabi', active: true },
  { key: 'jee',    icon: 'rocket_launch',     label: 'TARGET.02', title: 'JEE',     desc: 'Advanced technical screening for IIT entrance examination' },
  { key: 'neet',   icon: 'medical_services',  label: 'TARGET.03', title: 'NEET',    desc: 'Comprehensive data scan for medical entrance protocols' },
  { key: 'other',  icon: 'bolt',              label: 'TARGET.04', title: 'CUSTOM',  desc: 'Manual override for niche or specialized examination types' },
]

export default function SyllabusPage() {
  const [examType,  setExamType]  = useState('boards')
  const [subjectId, setSubjectId] = useState('')
  const [subjects,  setSubjects]  = useState([])
  const [file,      setFile]      = useState(null)
  const [pasteText, setPasteText] = useState('')
  const [mode,      setMode]      = useState('file')
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [result,    setResult]    = useState(null)
  const [saved,     setSaved]     = useState(false)
  const [groqKey,   setGroqKey]   = useState('')
  const fileRef = useRef()

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      const { data } = await supabase.from('subjects').select('id,name').eq('user_id', user.id)
      setSubjects(data || [])
      if (data?.length) setSubjectId(String(data[0].id))
    })()
  }, [])

  const analyse = async () => {
    setError(''); setResult(null); setSaved(false)
    if (mode === 'file' && !file) return setError('Upload a file first.')
    if (mode === 'text' && !pasteText.trim()) return setError('Paste syllabus text first.')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('exam_type', examType)
      if (subjectId) fd.append('subject_id', subjectId)
      if (mode === 'file') fd.append('file', file)
      if (mode === 'text') fd.append('text', pasteText)
      const { data: { session } } = await supabase.auth.getSession()
      const headers = {}
      if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
      if (groqKey.trim()) headers['X-Groq-Api-Key'] = groqKey.trim()
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/syllabus/analyse`, {
        method: 'POST', headers, body: fd,
      })
      if (!res.ok) { const j = await res.json().catch(()=>({})); throw new Error(j.error || `Error ${res.status}`) }
      setResult(await res.json())
    } catch(e) { setError(e.message) }
    finally { setLoading(false) }
  }

  const saveAll = async () => {
    if (!result || !subjectId) return
    setLoading(true)
    try {
      for (const t of result.topics) {
        await supabase.from('subtopics').insert({
          subject_id: parseInt(subjectId), name: t.name,
          notes: `Priority: ${t.priority}. ${(t.subtopics||[]).join(', ')}`,
          keywords: t.dependencies || [], status: 'not_started',
        })
      }
      for (const j of (result.jargon || [])) {
        await supabase.from('jargon_words').insert({
          subject_id: parseInt(subjectId), word: j.word, plain_definition: j.definition,
        })
      }
      setSaved(true)
    } catch(e) { setError('Save failed: ' + e.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="px-8 lg:px-20 max-w-7xl mx-auto text-center md:text-left">

      {/* ── Header (exact site.html) ── */}
      <header className="mb-32 text-center">
        <span className="text-[#A0A0A0] tracking-[0.4em] uppercase mb-8 block orbitron text-[10px]">
          Neural Curriculum Intelligence
        </span>
        <h1 className="orbitron text-[64px] md:text-[80px] uppercase mb-12 tracking-tight leading-[1.1]">
          AI Syllabus Analyser
        </h1>
        <div className="h-px w-32 bg-white mx-auto mb-12" />
        <p className="max-w-3xl mx-auto text-[#A0A0A0] opacity-80 leading-relaxed text-lg">
          Precision intelligence for educational roadmaps. Deep-scan your curriculum to identify
          high-yield topics, exam frequencies, knowledge dependencies, and jargon glossary — powered by Gemma AI.
        </p>
      </header>

      {/* ── Target selector grid (exact site.html) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
        {TARGETS.map((t, i) => (
          <div
            key={i}
            onClick={() => setExamType(t.key)}
            className={`group relative aspect-square border p-8 flex flex-col justify-between transition-all duration-300 cursor-pointer
              ${examType === t.key
                ? 'border-white bg-white/5'
                : 'border-white/10 hover:border-white/40'}`}
          >
            <div className="flex justify-between items-start">
              <span className={`material-symbols-outlined text-4xl font-light ${examType === t.key ? 'opacity-100' : 'opacity-40'}`}>
                {t.icon}
              </span>
              <span className="text-[10px] opacity-40 orbitron">{t.label}</span>
            </div>
            <div>
              <h3 className="orbitron text-lg uppercase mb-2">{t.title}</h3>
              <p className="text-[10px] opacity-60 uppercase orbitron">{t.desc}</p>
            </div>
            {examType === t.key && (
              <div className="absolute top-2 right-2 h-2 w-2 bg-white animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* ── Two column layout (exact site.html) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-20 mb-20">

        {/* LEFT: Context Binding */}
        <section className="flex flex-col gap-10">
          <div className="flex items-center gap-4">
            <span className="bg-white text-black px-3 py-1 orbitron font-bold text-sm">02</span>
            <h2 className="orbitron text-lg uppercase">Context Binding</h2>
          </div>
          <div className="space-y-8">
            {subjects.length > 0 && (
              <div className="relative">
                <label className="text-[10px] uppercase text-white/50 mb-3 block tracking-widest orbitron">
                  Subject Target
                </label>
                <select
                  className="w-full bg-black border border-white/20 px-6 py-5 text-white focus:border-white/60 outline-none orbitron text-sm"
                  value={subjectId}
                  onChange={e => setSubjectId(e.target.value)}
                >
                  <option value="">— Select Subject —</option>
                  {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            )}

            {/* Mode toggle */}
            <div className="flex gap-3">
              {[{k:'file',l:'UPLOAD FILE'},{k:'text',l:'PASTE TEXT'}].map(m => (
                <button
                  key={m.k}
                  onClick={() => setMode(m.k)}
                  className={`flex-1 py-3 orbitron text-[10px] uppercase tracking-widest border transition-all
                    ${mode === m.k ? 'bg-white text-black border-white' : 'bg-transparent text-white/40 border-white/20 hover:border-white/60 hover:text-white'}`}
                >
                  {m.l}
                </button>
              ))}
            </div>

            <div className="p-8 border border-white/5" style={{ background: 'rgba(255,255,255,0.02)' }}>
              <div className="flex items-center gap-3 mb-3">
                <span className="material-symbols-outlined text-white text-sm">info</span>
                <span className="text-[10px] text-white uppercase tracking-widest orbitron">System Note</span>
              </div>
              <p className="text-[#A0A0A0] text-sm opacity-60 leading-relaxed uppercase tracking-wider orbitron text-[10px]">
                AI analyses syllabus structure, identifies priority topics, builds dependency map, and extracts jargon glossary automatically.
              </p>
            </div>

            {/* Groq key override */}
            <div>
              <label className="text-[10px] uppercase text-white/30 mb-2 block tracking-widest orbitron">
                Groq API Key Override (optional)
              </label>
              <input
                type="password"
                className="w-full bg-black border border-white/10 px-4 py-3 text-white text-sm focus:border-white/40 outline-none"
                placeholder="gsk_... (only if backend key not set)"
                value={groqKey}
                onChange={e => setGroqKey(e.target.value)}
              />
            </div>
          </div>
        </section>

        {/* RIGHT: Data Ingestion (exact site.html) */}
        <section className="flex flex-col gap-10">
          <div className="flex items-center gap-4">
            <span className="bg-white text-black px-3 py-1 orbitron font-bold text-sm">03</span>
            <h2 className="orbitron text-lg uppercase">Data Ingestion</h2>
          </div>

          {mode === 'file' ? (
            <div
              onClick={() => fileRef.current.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); setFile(e.dataTransfer.files[0]) }}
              className="flex-1 border-2 border-dashed border-white/10 hover:border-white/50 transition-all duration-500 flex flex-col items-center justify-center p-16 cursor-pointer min-h-[300px]"
            >
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt"
                onChange={e => setFile(e.target.files[0])} style={{ display:'none' }} />
              <span className="material-symbols-outlined text-6xl font-extralight mb-8 text-white/20">
                {file ? 'task' : 'upload_file'}
              </span>
              {file ? (
                <>
                  <h4 className="orbitron text-sm uppercase mb-3 tracking-widest text-white">{file.name}</h4>
                  <p className="text-[10px] opacity-40 orbitron">{(file.size/1024).toFixed(1)} KB · CLICK TO CHANGE</p>
                </>
              ) : (
                <>
                  <h4 className="orbitron text-sm uppercase mb-3 tracking-widest">DRAG SOURCE FILE</h4>
                  <p className="text-[10px] opacity-40 mb-10 orbitron">SUPPORTED: PDF, DOCX, TXT</p>
                </>
              )}
              <button
                className="bg-white text-black px-10 py-4 hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all orbitron text-[10px] uppercase tracking-widest font-bold mt-4"
                onClick={e => { e.stopPropagation(); fileRef.current.click() }}
              >
                BROWSE FILES
              </button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <textarea
                className="flex-1 bg-black border border-white/20 p-6 text-white text-sm outline-none focus:border-white/60 resize-none min-h-[300px]"
                placeholder="PASTE SYLLABUS CONTENT HERE...&#10;&#10;Supports raw text, markdown, or copied curriculum content."
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
              />
            </div>
          )}
        </section>
      </div>

      {/* Error */}
      {error && (
        <div className="border border-red-500/30 bg-red-500/10 p-4 mb-8">
          <p className="orbitron text-[10px] uppercase text-red-400 tracking-widest">{error}</p>
        </div>
      )}

      {/* ── Analyse button ── */}
      <div className="flex justify-center mb-20">
        <button
          onClick={analyse}
          disabled={loading}
          className="bg-white text-black px-16 py-5 orbitron text-xs uppercase tracking-[0.3em] font-bold hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-4"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
              GEMMA AI ANALYSING…
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              EXECUTE ANALYSIS
            </>
          )}
        </button>
      </div>

      {/* ── Results (site.html aesthetic) ── */}
      {result && (
        <div className="space-y-16 mb-20">

          {/* Result header */}
          <div className="border border-white/20 p-8 flex items-center justify-between flex-wrap gap-6">
            <div>
              <span className="orbitron text-[10px] text-white/40 tracking-widest block mb-2">
                ANALYSIS COMPLETE
              </span>
              <p className="orbitron text-2xl uppercase tracking-tight">
                {result.topics?.length || 0} Topics · {result.jargon?.length || 0} Jargon Terms
              </p>
            </div>
            {!saved ? (
              <button
                onClick={saveAll}
                disabled={loading || !subjectId}
                className="bg-white text-black px-10 py-4 orbitron text-[10px] uppercase tracking-widest font-bold hover:shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all disabled:opacity-40"
              >
                {loading ? 'SAVING…' : 'SAVE TO SUBJECT →'}
              </button>
            ) : (
              <span className="orbitron text-[10px] tracking-widest border border-white/30 px-6 py-3 text-white/60">
                ✓ SAVED TO DATABASE
              </span>
            )}
          </div>

          {!subjectId && (
            <div className="border border-white/10 p-4">
              <p className="orbitron text-[10px] text-white/40 uppercase tracking-widest">
                ⚠ No subject linked — select one above to enable save
              </p>
            </div>
          )}

          {/* Topics */}
          {result.topics?.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <span className="bg-white text-black px-3 py-1 orbitron font-bold text-sm">TOPICS</span>
                <div className="h-px flex-1 bg-white/10" />
                <span className="orbitron text-[10px] text-white/40">{examType.toUpperCase()} · PRIORITY RANKED</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {result.topics.map((t, i) => (
                  <div key={i} className="border border-white/10 p-6 hover:border-white/30 transition-all">
                    <div className="flex items-center justify-between mb-3">
                      <span className={`orbitron text-[10px] uppercase tracking-widest ${
                        t.priority === 'high' ? 'text-red-400' :
                        t.priority === 'medium' ? 'text-yellow-400' : 'text-white/40'
                      }`}>
                        {t.priority === 'high' ? '▲ HIGH' : t.priority === 'medium' ? '■ MEDIUM' : '▼ LOW'}
                      </span>
                      {t.examFrequency && (
                        <span className="orbitron text-[9px] px-2 py-1 border border-white/20 text-white/40">
                          {examType.toUpperCase()} · {t.examFrequency}
                        </span>
                      )}
                    </div>
                    <h3 className="orbitron text-base uppercase mb-2">{t.name}</h3>
                    {t.subtopics?.length > 0 && (
                      <div className="mt-3 space-y-1">
                        {t.subtopics.slice(0,3).map((st, j) => (
                          <p key={j} className="orbitron text-[10px] text-white/40 uppercase tracking-wider">
                            — {st}
                          </p>
                        ))}
                        {t.subtopics.length > 3 && (
                          <p className="orbitron text-[10px] text-white/20">+{t.subtopics.length-3} more</p>
                        )}
                      </div>
                    )}
                    {t.dependencies?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {t.dependencies.map((d, j) => (
                          <span key={j} className="orbitron text-[9px] px-2 py-1 border border-white/10 text-white/30">
                            ↳ {d}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Jargon (exact site.html jargon-card style) */}
          {result.jargon?.length > 0 && (
            <div>
              <div className="flex items-center gap-4 mb-8">
                <span className="bg-white text-black px-3 py-1 orbitron font-bold text-sm">JARGON</span>
                <div className="h-px flex-1 bg-white/10" />
                <span className="orbitron text-[10px] text-white/40">JARGON_REPOSITORY_v1.0</span>
              </div>
              <div className="space-y-0">
                {result.jargon.map((j, i) => (
                  <div key={i} className="jargon-card p-6 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <h3 className="orbitron text-xl tracking-wider">{j.word}</h3>
                      <span className="text-[10px] orbitron px-2 py-1 border border-white/20 text-white/40">
                        {examType.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white/70 leading-relaxed text-sm">{j.definition}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Exam insight */}
          {result.examInsight && (
            <div className="border border-white/10 p-8">
              <span className="orbitron text-[10px] text-white/40 tracking-widest block mb-4">
                EXAM FREQUENCY INSIGHT · {examType.toUpperCase()}
              </span>
              <p className="text-white/70 leading-relaxed">{result.examInsight}</p>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
