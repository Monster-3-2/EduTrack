import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function AuthPage() {
  const [mode,     setMode]     = useState('signin')
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [name,     setName]     = useState('')
  const [loading,  setLoading]  = useState(false)
  const [msg,      setMsg]      = useState({ text: '', error: false })

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMsg({ text: '', error: false })
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setMsg({ text: error.message, error: true })
    } else {
      const { error } = await supabase.auth.signUp({ email, password, options: { data: { name } } })
      if (error) setMsg({ text: error.message, error: true })
      else setMsg({ text: 'Check your email to confirm your account!', error: false })
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {/* Crystal bg */}
      <div className="crystal-bg">
        {[5,15,25,35,45,55,65,75,85,95].map((left,i) => (
          <div key={i} className="crystal" style={{ left:`${left}%`, animationDuration:`${9+(i%3)*3}s`, animationDelay:`${-i}s` }} />
        ))}
        <div className="scanline" />
      </div>

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 10 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <svg style={{ height: 48, width: 'auto', fill: 'white', display: 'inline-block' }} viewBox="0 0 526 475">
            <path d="M230.9 95.8c0 0-230.9 0-230.9 0v1.1c1.4 0 1.4 0 2.8 0 3.1 0 6.1 0 9.2 0 2.1 0 4.2 0 6.3 0 4.5 0 8.9 0 13.4 0.1 5.7 0.1 11.4 0 17.1 0 4.4 0 8.8 0 13.2 0 2.1 0 4.2 0 6.3 0 2.9 0 5.9 0 8.8 0 1.3 0 1.3 0 2.7 0 6 0 6 0 7.1 1.1 0.1 1.8 0.2 3.6 0.2 5.4 0 1.2 0 2.4 0 3.6 0 1.3 0 2.6 0 4 0 1.4 0 2.8 0 4.2 0 3.8 0 7.5 0 11.3 0 2.3 0 4.6 0 6.9 0 7.4 0 14.8 0 22.2 0.1 8.5 0.1 17 0.1 25.5 0.2 6.6 0.1 13.2 0.1 19.8 0.1 3.9 0 7.8 0 11.7 0.1 3.7 0 7.4 0 11.1 0.1 2 0 4 0 6 0.1 1.2 0 2.4 0 3.6 0 1 0 2.1 0 3.2 0-0.7 5.5-4 8.6-8.1 12.1-0.9 0.8-1.8 1.6-2.7 2.4-0.9 0.7-1.8 1.5-2.7 2.3-1.4 1.2-2.7 2.4-4.1 3.6-0.6 0.5-1.3 1.1-1.9 1.6-1.5 1.3-3 2.6-4.5 4-0.8 0.7-1.6 1.5-2.4 2.2-0.7 0.7-1.4 1.4-2.2 2.1-1.9 1.5-1.9 1.5-3.9 1.5-0.2 0.6-0.5 1.2-0.8 1.8-1.4 2.6-3 4.1-5.2 6-0.7 0.6-1.4 1.2-2.1 1.9-1.9 1.4-1.9 1.4-3.9 1.4-0.3 1-0.7 2-1 3-2.1 1.7-2.1 1.7-4 3-4 1.7-6.9 4.6-10 7.6-2.9 2.7-5.6 5.3-8.9 7.5 0-0.7 0-1.3 0-2 2-1 2-1 4-2s0-0.7 0-1.3c-0.6-0.2-1.1-0.5-1.7-0.7-2.7-1.5-4.7-3.2-6.9-5.3-0.9-0.8-1.7-1.6-2.6-2.4-0.9-0.8-1.8-1.7-2.7-2.5-1.9-1.7-3.7-3.4-5.6-5.1-1.5-1.3-3-2.6-4.4-3.9 0.5-4.1 2.8-6.3 5.6-9.3-0.8-0.9-1.7-1.8-2.5-2.7-1-1-1-1-2-2 2.9 1.3 5 2.8 7.3 5 0.6 0.6 1.2 1.2 1.8 1.8 0.6 0.6 1.3 1.2 2 1.9 5.3 5.1 10.7 9.9 16.5 14.5 2.6 2.2 5 4.5 7.4 7 3.7-1.6 6.3-4 9.2-6.7 1-0.9 1.9-1.8 2.9-2.7 0.9-0.9 1.9-1.7 2.8-2.6 1.5-1.4 3-2.7 4.5-4.1 0.6-0.5 1.2-1.1 1.8-1.6 1.7-1.3 1.7-1.3 4.7-2.3 0.3-1 0.7-2 1-3 0.8-0.6 1.7-1.3 2.5-2 2.7-2.2 2.9-2.8 3.5-6.1-2.3-0.7-4.6-1.4-6.9-2.1-2.1-0.6-4.3-1.3-6.4-2-25.9-7.7-45.9-4.7-69.7 7-10.7 5.1-21.8 8.3-33.7 4.9-8.8-3.5-16.5-8.2-23.2-14.9 0.5-4.7 2.2-6.6 5.6-9.8 0.8-0.8 1.6-1.6 2.5-2.4 0.6-0.6 1.3-1.2 2-1.8-2.9 1.4-5.3 2.9-7.8 4.9-7.1 5.4-13.4 7.2-22.2 6.1-3.2-1-6.1-2.4-9-4-7.8-4-7.8-4-10-4v-37.3v-37.3v-38.4c3.4-1.7 7.2-1.1 10.9-1.1z"/>
          </svg>
          <div className="orbitron text-2xl font-bold text-white mt-4 tracking-tighter">EduTrack</div>
          <div className="text-[10px] text-[#A0A0A0] tracking-[0.3em] uppercase orbitron mt-1">Intelligence Engine v4.0</div>
        </div>

        {/* Card */}
        <div className="glass-card p-8 rounded-2xl">
          <h2 className="orbitron text-lg uppercase tracking-widest text-white mb-1">
            {mode === 'signin' ? 'SIGN IN' : 'CREATE ACCOUNT'}
          </h2>
          <p className="text-[#A0A0A0] text-xs tracking-widest mb-8 orbitron uppercase">
            {mode === 'signin' ? 'Access your command centre' : 'Begin your mission'}
          </p>

          <form onSubmit={submit} className="space-y-5">
            {mode === 'signup' && (
              <div>
                <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Operator Name</label>
                <input className="input" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} required />
              </div>
            )}
            <div>
              <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Email</label>
              <input type="email" className="input" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="text-[10px] uppercase text-white/50 mb-2 block tracking-widest orbitron">Password</label>
              <input type="password" className="input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {msg.text && (
              <div style={{
                border: `1px solid ${msg.error ? 'rgba(255,94,94,0.4)' : 'rgba(255,255,255,0.3)'}`,
                background: msg.error ? 'rgba(255,94,94,0.08)' : 'rgba(255,255,255,0.05)',
                borderRadius: 6, padding: '10px 14px',
                fontSize: 12, color: msg.error ? '#ff5e5e' : '#fff', fontFamily: 'Space Grotesk'
              }}>
                {msg.text}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center" style={{ borderRadius: 6 }}>
              {loading ? 'Processing…' : mode === 'signin' ? 'ACCESS SYSTEM →' : 'INITIALISE ACCOUNT →'}
            </button>
          </form>

          <p className="text-center mt-6 text-[10px] text-white/40 orbitron uppercase tracking-wider">
            {mode === 'signin' ? 'No account? ' : 'Have an account? '}
            <button onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg({ text:'', error:false }) }}
              style={{ color:'white', fontWeight:700, background:'none', border:'none', cursor:'pointer', fontFamily:'Orbitron', fontSize:10, letterSpacing:'0.1em' }}>
              {mode === 'signin' ? 'REGISTER →' : 'SIGN IN →'}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
