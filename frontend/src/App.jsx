import { useState, useEffect, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout       from './components/Layout'
import Landing      from './pages/Landing'
import AuthPage     from './pages/AuthPage'
import Dashboard    from './pages/Dashboard'
import SubjectPage  from './pages/SubjectPage'
import MemoryPage   from './pages/MemoryPage'
import ExamPage     from './pages/ExamPage'
import MasteryPage  from './pages/MasteryPage'
import ProfilePage  from './pages/ProfilePage'
import SyllabusPage from './pages/SyllabusPage'

const AuthContext = createContext(null)
export const useAuth = () => useContext(AuthContext)

export default function App() {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#000' }}>
      <div style={{ textAlign:'center' }}>
        <div className="w-10 h-10 border border-white border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="orbitron text-xs text-white/40 tracking-widest uppercase mt-4">Initialising…</p>
      </div>
    </div>
  )

  return (
    <AuthContext.Provider value={{ user }}>
      <BrowserRouter>
        <Routes>
          {/* Public landing — always visible */}
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={!user ? <AuthPage /> : <Navigate to="/dashboard" />} />

          {/* Protected app routes — wrapped in Layout */}
          <Route element={user ? <Layout /> : <Navigate to="/auth" />}>
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="subject/:id" element={<SubjectPage />} />
            <Route path="memory"      element={<MemoryPage />} />
            <Route path="exam"        element={<ExamPage />} />
            <Route path="mastery"     element={<MasteryPage />} />
            <Route path="profile"     element={<ProfilePage />} />
            <Route path="syllabus"    element={<SyllabusPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
