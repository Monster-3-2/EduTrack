import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../App'

const NAV = [
  { to: '/dashboard', label: 'DASHBOARD',     end: true },
  { to: '/syllabus',  label: 'SYLLABUS'               },
  { to: '/memory',    label: 'MEMORY ENGINE'           },
  { to: '/exam',      label: 'EXAM INTEL'              },
  { to: '/mastery',   label: 'MASTERY PROOF'           },
  { to: '/profile',   label: 'PROFILE'                 },
]

function Background() {
  return (
    <div className="crystal-bg">
      {[5,15,25,35,45,55,65,75,85,95].map((left,i) => (
        <div key={i} className="crystal" style={{
          left: `${left}%`,
          animationDuration: `${9+(i%3)*3}s`,
          animationDelay: `${-i}s`
        }} />
      ))}
      <div className="scanline" />
    </div>
  )
}

export default function Layout() {
  const { user }        = useAuth()
  const navigate        = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  const name = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate('/auth')
  }

  return (
    <div className="min-h-screen relative">
      <Background />

      {/* ── Top nav ── */}
      <div className="fixed top-6 left-0 right-0 z-50 flex justify-center px-4">
        <nav className="liquid-glass rounded-full px-8 py-3 flex items-center justify-between w-full max-w-7xl shadow-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
            <div className="flex items-center h-8">
              <svg className="h-8 w-auto fill-white" viewBox="0 0 526 475">
                <path d="M230.9 95.8c0 0-230.9 0-230.9 0v1.1c1.4 0 1.4 0 2.8 0 3.1 0 6.1 0 9.2 0 2.1 0 4.2 0 6.3 0 4.5 0 8.9 0 13.4 0.1 5.7 0.1 11.4 0 17.1 0 4.4 0 8.8 0 13.2 0 2.1 0 4.2 0 6.3 0 2.9 0 5.9 0 8.8 0 1.3 0 1.3 0 2.7 0 6 0 6 0 7.1 1.1 0.1 1.8 0.2 3.6 0.2 5.4 0 1.2 0 2.4 0 3.6 0 1.3 0 2.6 0 4 0 1.4 0 2.8 0 4.2 0 3.8 0 7.5 0 11.3 0 2.3 0 4.6 0 6.9 0 7.4 0 14.8 0 22.2 0.1 8.5 0.1 17 0.1 25.5 0.2 6.6 0.1 13.2 0.1 19.8 0.1 3.9 0 7.8 0 11.7 0.1 3.7 0 7.4 0 11.1 0.1 2 0 4 0 6 0.1 1.2 0 2.4 0 3.6 0 1 0 2.1 0 3.2 0-0.7 5.5-4 8.6-8.1 12.1-0.9 0.8-1.8 1.6-2.7 2.4-0.9 0.7-1.8 1.5-2.7 2.3-1.4 1.2-2.7 2.4-4.1 3.6-0.6 0.5-1.3 1.1-1.9 1.6-1.5 1.3-3 2.6-4.5 4-0.8 0.7-1.6 1.5-2.4 2.2-0.7 0.7-1.4 1.4-2.2 2.1-1.9 1.5-1.9 1.5-3.9 1.5-0.2 0.6-0.5 1.2-0.8 1.8-1.4 2.6-3 4.1-5.2 6-0.7 0.6-1.4 1.2-2.1 1.9-1.9 1.4-1.9 1.4-3.9 1.4-0.3 1-0.7 2-1 3-2.1 1.7-2.1 1.7-4 3-4 1.7-6.9 4.6-10 7.6-2.9 2.7-5.6 5.3-8.9 7.5 0-0.7 0-1.3 0-2 2-1 2-1 4-2s0-0.7 0-1.3c-0.6-0.2-1.1-0.5-1.7-0.7-2.7-1.5-4.7-3.2-6.9-5.3-0.9-0.8-1.7-1.6-2.6-2.4-0.9-0.8-1.8-1.7-2.7-2.5-1.9-1.7-3.7-3.4-5.6-5.1-1.5-1.3-3-2.6-4.4-3.9 0.5-4.1 2.8-6.3 5.6-9.3-0.8-0.9-1.7-1.8-2.5-2.7-1-1-1-1-2-2 2.9 1.3 5 2.8 7.3 5 0.6 0.6 1.2 1.2 1.8 1.8 0.6 0.6 1.3 1.2 2 1.9 5.3 5.1 10.7 9.9 16.5 14.5 2.6 2.2 5 4.5 7.4 7 3.7-1.6 6.3-4 9.2-6.7 1-0.9 1.9-1.8 2.9-2.7 0.9-0.9 1.9-1.7 2.8-2.6 1.5-1.4 3-2.7 4.5-4.1 0.6-0.5 1.2-1.1 1.8-1.6 1.7-1.3 1.7-1.3 4.7-2.3 0.3-1 0.7-2 1-3 0.8-0.6 1.7-1.3 2.5-2 2.7-2.2 2.9-2.8 3.5-6.1-2.3-0.7-4.6-1.4-6.9-2.1-2.1-0.6-4.3-1.3-6.4-2-25.9-7.7-45.9-4.7-69.7 7-10.7 5.1-21.8 8.3-33.7 4.9-8.8-3.5-16.5-8.2-23.2-14.9 0.5-4.7 2.2-6.6 5.6-9.8 0.8-0.8 1.6-1.6 2.5-2.4 0.6-0.6 1.3-1.2 2-1.8-2.9 1.4-5.3 2.9-7.8 4.9-7.1 5.4-13.4 7.2-22.2 6.1-3.2-1-6.1-2.4-9-4-7.8-4-7.8-4-10-4v-37.3v-37.3v-38.4c3.4-1.7 7.2-1.1 10.9-1.1z"/>
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tighter text-white orbitron">EduTrack</span>
          </div>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            {NAV.map(item => (
              <NavLink key={item.to} to={item.to} end={item.end}
                className={({ isActive }) =>
                  `text-[10px] orbitron uppercase tracking-[0.2em] transition-colors pb-1 border-b ${
                    isActive ? 'text-white border-white' : 'text-[#A0A0A0] border-transparent hover:text-white'
                  }`
                }>
                {item.label}
              </NavLink>
            ))}
          </div>

          {/* Right: user name + sign out */}
          <div className="flex items-center gap-4">
            <span className="hidden sm:block text-[#A0A0A0] text-[10px] uppercase tracking-wider orbitron">
              {name.toUpperCase()}
            </span>
            <button
              onClick={handleSignOut}
              className="bg-white text-black font-bold text-[10px] uppercase tracking-widest px-6 py-2 rounded-full hover:scale-105 active:scale-95 transition-all orbitron">
              LOGOUT
            </button>
          </div>
        </nav>
      </div>

      {/* ── Page content ── */}
      <div className="relative z-10 pt-32 pb-20 page">
        <Outlet />
      </div>

      {/* ── Footer status ── */}
      <footer className="fixed bottom-0 left-0 right-0 p-6 z-40 flex justify-between pointer-events-none">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.8)]" />
            <span className="text-[10px] uppercase text-white/40 orbitron">Engine.Status: Nominal</span>
          </div>
          <span className="text-[10px] uppercase text-white/20 orbitron">Version: 4.0.2-Void</span>
        </div>
        <div className="text-right">
          <span className="text-[10px] uppercase text-white/40 block orbitron">Server_Loc: Arctic_Node_01</span>
          <span className="text-[10px] uppercase text-white/20 block orbitron">Uptime: 99.999%</span>
        </div>
      </footer>
    </div>
  )
}
