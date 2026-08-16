import { supabase } from './supabase'

// Attaches the Supabase JWT to every Flask request
async function call(method, path, body = null, formData = null) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = {}
  if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
  if (body) headers['Content-Type'] = 'application/json'

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: formData || (body ? JSON.stringify(body) : null)
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

const get  = (path)        => call('GET',    path)
const post = (path, body)  => call('POST',   path, body)
const patch= (path, body)  => call('PATCH',  path, body)
const del  = (path)        => call('DELETE', path)
const upload = (path, fd)  => call('POST',   path, null, fd)

// ── Subjects ──────────────────────────────────────────────
export const api = {
  subjects: {
    list:   ()       => get('/subjects'),
    create: (data)   => post('/subjects', data),
    delete: (id)     => del(`/subjects/${id}`),
  },

  // ── Subtopics ─────────────────────────────────────────
  subtopics: {
    list:         (subjectId) => get(`/subtopics/${subjectId}`),
    create:       (data)      => post('/subtopics', data),
    updateStatus: (id, status)=> patch(`/subtopics/${id}/status`, { status }),
    delete:       (id)        => del(`/subtopics/${id}`),
  },

  // ── Recall / Memory Engine ────────────────────────────
  recall: {
    log:      (data) => post('/recall', data),
    dueToday: ()     => get('/recall/due-today'),
    history:  (id)   => get(`/recall/${id}`),
    mistakes: ()     => get('/recall/mistakes'),
  },

  // ── Exam Intelligence ─────────────────────────────────
  exam: {
    upload:  (subjectId, fd) => upload(`/exam/upload/${subjectId}`, fd),
    heatmap: (subjectId)     => get(`/exam/heatmap/${subjectId}`),
    trends:  (subjectId)     => get(`/exam/trends/${subjectId}`),
    papers:  (subjectId)     => get(`/exam/papers/${subjectId}`),
  },

  // ── Mastery Proof ─────────────────────────────────────
  mastery: {
    saveExplanation: (data)       => post('/mastery/explanation', data),
    getHistory:      (subtopicId) => get(`/mastery/history/${subtopicId}`),
    addJargon:       (data)       => post('/mastery/jargon', data),
    getJargon:       (subjectId)  => get(`/mastery/jargon/${subjectId}`),
    deleteJargon:    (id)         => del(`/mastery/jargon/${id}`),
  },

  // ── Dashboard / Command Center ────────────────────────
  dashboard: {
    readiness:   (subjectId) => get(`/dashboard/readiness/${subjectId}`),
    priority:    (subjectId) => get(`/dashboard/priority/${subjectId}`),
    weeklyInsight:(subjectId)=> get(`/dashboard/weekly/${subjectId}`),
    gapAlert:    (subjectId) => get(`/dashboard/gap-alert/${subjectId}`),
  },

  // ── ML Profile ────────────────────────────────────────
  ml: {
    getProfile:   ()     => get('/ml/profile'),
    updateProfile:()     => post('/ml/update-profile', {}),
    getHint:      (subtopicId, topic) => get(`/ml/hint/${subtopicId}?topic=${topic}`),
  }
}
