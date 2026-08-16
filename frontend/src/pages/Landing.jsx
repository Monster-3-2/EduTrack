import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'

export default function Landing() {
  const navigate  = useNavigate()
  const { user }  = useAuth()
  const frameRef  = useRef(null)

  useEffect(() => {
    const iframe = frameRef.current
    if (!iframe) return
    const onLoad = () => {
      try {
        const doc = iframe.contentDocument
        if (!doc) return
        // Wire every CTA that points to /auth
        doc.querySelectorAll('a[href="/auth"]').forEach(a => {
          a.addEventListener('click', (e) => {
            e.preventDefault()
            navigate(user ? '/dashboard' : '/auth')
          })
        })
      } catch(_) {}
    }
    iframe.addEventListener('load', onLoad)
    return () => iframe.removeEventListener('load', onLoad)
  }, [navigate, user])

  return (
    <iframe
      ref={frameRef}
      src="/landing.html"
      style={{ width:'100%', height:'100vh', border:'none', display:'block' }}
      title="EduTrack"
    />
  )
}
