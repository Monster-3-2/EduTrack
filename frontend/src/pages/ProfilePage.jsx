import { useState, useEffect } from 'react'
import { Brain, Eye, RefreshCw, Target, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'
import { useAuth } from '../App'

export default function ProfilePage() {
  const { user }      = useAuth()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)

  const name     = user?.user_metadata?.name || user?.email?.split('@')[0] || 'Student'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

  useEffect(() => {
    const load = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()

      const { data: sessions }    = await supabase.from('recall_sessions').select('*')
      const { data: subjects }    = await supabase.from('subjects').select('*').eq('user_id', u.id)
      const { data: subtopics }   = await supabase.from('subtopics').select('*')
      const { data: explanations} = await supabase.from('explanations').select('clarity_score')
      const { data: papers }      = await supabase.from('exam_papers').select('id')

      const totalSessions = sessions?.length || 0
      const avgRecall     = totalSessions
        ? Math.round(sessions.reduce((s, r) => s + (r.actual_score || 0), 0) / totalSessions)
        : 0
      const avgConfGap    = totalSessions
        ? Math.round(sessions.reduce((s, r) => s + ((r.predicted_score || 0) - (r.actual_score || 0)), 0) / totalSessions)
        : 0
      const avgClarity    = explanations?.length
        ? Math.round(explanations.reduce((s, e) => s + (e.clarity_score || 0), 0) / explanations.length)
        : 0
      const studiedCount  = subtopics?.filter(s => s.status === 'studied').length || 0
      const consistency   = Math.min(100, totalSessions * 4)

      // Derive learner type from behavior
      const hasExamPapers = (papers?.length || 0) > 0
      const teachScore    = avgClarity
      const drillScore    = Math.min(100, totalSessions * 3)

      const visual      = hasExamPapers ? 60 : 20
      const conceptual  = teachScore
      const repetition  = drillScore
      const typeTotal   = visual + conceptual + repetition || 1

      setStats({
        totalSessions, avgRecall, avgConfGap, avgClarity, studiedCount,
        subjectCount: subjects?.length || 0, consistency,
        learnerType: {
          visual:      Math.round(visual / typeTotal * 100),
          conceptual:  Math.round(conceptual / typeTotal * 100),
          repetition:  Math.round(repetition / typeTotal * 100),
        },
        radarData: [
          { subject: 'Memory',      value: avgRecall    },
          { subject: 'Clarity',     value: avgClarity   },
          { subject: 'Coverage',    value: Math.min(100, studiedCount * 8) },
          { subject: 'Consistency', value: consistency  },
          { subject: 'Confidence',  value: Math.max(0, 100 - Math.abs(avgConfGap)) },
        ]
      })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="flex justify-center py-20"><div className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>

  const dominant = stats ? Object.entries(stats.learnerType).sort((a,b) => b[1]-a[1])[0][0] : null
  const learnerTypes = [
    { key: 'visual',     label: 'Visual',      icon: Eye,        color: 'text-teal',   desc: 'Learns best through diagrams, heatmaps, and visual patterns.' },
    { key: 'conceptual', label: 'Conceptual',  icon: Brain,      color: 'text-accent', desc: 'Understands deeply by grasping the why before the what.' },
    { key: 'repetition', label: 'Repetition',  icon: RefreshCw,  color: 'text-amber',  desc: 'Recall improves dramatically through repeated practice sessions.' },
  ]

  return (
    <div className="px-8 lg:px-20 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="orbitron text-5xl uppercase tracking-tighter mb-2">My Profile</h1>
        <p className="text-[#A0A0A0] text-sm tracking-wider">How the app has learned to understand how you learn.</p>
      </div>

      {/* Identity card */}
      <div className="glass-card p-5 flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-accent/20 border-2 border-accent/30 flex items-center justify-center">
          <span className="font-display font-800 text-accent text-xl">{initials}</span>
        </div>
        <div>
          <p className="font-display font-700 text-white text-lg">{name}</p>
          <p className="text-[#A0A0A0] text-sm tracking-wider">{user?.email}</p>
          {dominant && (
            <span className="inline-flex items-center gap-1.5 mt-1.5 text-xs bg-accent/10 border border-accent/20 text-accent px-2.5 py-0.5 rounded-full">
              <Brain size={11} /> Primarily a {dominant} learner
            </span>
          )}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Sessions',     val: stats.totalSessions,  color: 'text-accent' },
          { label: 'Avg Recall',   val: `${stats.avgRecall}%`, color: 'text-teal'  },
          { label: 'Avg Clarity',  val: `${stats.avgClarity}`, color: 'text-amber' },
          { label: 'Conf. Gap',    val: `${stats.avgConfGap > 0 ? '+' : ''}${stats.avgConfGap}%`,
            color: Math.abs(stats.avgConfGap) > 15 ? 'text-rose' : 'text-teal' },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass-card p-4 text-center">
            <p className={`font-display font-700 text-xl ${color}`}>{val}</p>
            <p className="text-muted text-xs mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Confidence insight */}
      {Math.abs(stats.avgConfGap) > 15 && (
        <div className={`card p-4 border ${stats.avgConfGap > 0 ? 'border-rose/20' : 'border-teal/20'}`}>
          <div className="flex items-center gap-2 mb-1">
            <Target size={14} className={stats.avgConfGap > 0 ? 'text-rose' : 'text-teal'} />
            <span className="font-display font-600 text-white text-sm">
              {stats.avgConfGap > 0 ? 'You tend to overestimate yourself' : 'You know more than you think!'}
            </span>
          </div>
          <p className="text-muted text-xs">
            {stats.avgConfGap > 0
              ? `You predict ${stats.avgConfGap}% higher than your actual recall on average. Try being more conservative.`
              : `You score ${Math.abs(stats.avgConfGap)}% higher than you predict. Trust yourself more.`}
          </p>
        </div>
      )}

      {/* Radar chart */}
      <div className="glass-card p-5">
        <h2 className="font-display font-700 text-white text-base mb-4 flex items-center gap-2">
          <TrendingUp size={16} className="text-accent" /> Learning Radar
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={stats.radarData}>
            <PolarGrid stroke="#2a2a3d" />
            <PolarAngleAxis dataKey="subject" tick={{ fill: '#6b6b8a', fontSize: 12 }} />
            <Radar dataKey="value" stroke="#7c6aff" fill="#7c6aff" fillOpacity={0.15} strokeWidth={2} />
            <Tooltip contentStyle={{ background: '#1a1a26', border: '1px solid #2a2a3d', borderRadius: 10 }} />
          </RadarChart>
        </ResponsiveContainer>
      </div>

      {/* Learner type breakdown */}
      <div>
        <h2 className="font-display font-700 text-white text-base mb-3">Your Learning Style</h2>
        <div className="space-y-3">
          {learnerTypes.sort((a,b) => stats.learnerType[b.key] - stats.learnerType[a.key]).map(({ key, label, icon: Icon, color, desc }) => (
            <div key={key} className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon size={15} className={color} />
                <span className="font-display font-600 text-white text-sm">{label}</span>
                <span className={`ml-auto font-display font-700 ${color}`}>{stats.learnerType[key]}%</span>
              </div>
              <div className="h-1.5 bg-border rounded-full overflow-hidden mb-2">
                <div className={`h-full rounded-full transition-all duration-700 ${color.replace('text-', 'bg-')}`}
                  style={{ width: `${stats.learnerType[key]}%` }} />
              </div>
              <p className="text-muted text-xs">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-muted text-xs pb-4">
        Your profile improves as you use the app more. Keep reviewing! 🧠
      </p>
    </div>
  )
}
