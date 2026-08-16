# EduTrack v4.0 — Full Setup Guide

## Architecture

```
/  (Landing page — your exact edutrack.html with video bg + GSAP)
    ↓  "Start Studying" / "Get Started" / any CTA
/auth  (Sign in / Sign up — Supabase Auth)
    ↓  on success
/dashboard  (Main hub — subjects, readiness scores)
    ↓  navigate to
/syllabus   /memory   /exam   /mastery   /profile
    ↑↑ all wired to Flask backend API ↑↑
         https://edutrack-4b4o.onrender.com
              ↕ Supabase Postgres DB
```

## Quick Start (Local Dev)

### 1. Backend (Flask)
```bash
cd backend
pip install -r requirements.txt
python app.py          # → http://localhost:5000
```

### 2. Frontend (Vite + React)
```bash
cd frontend
npm install
npm run dev            # → http://localhost:5173
```

Vite proxies `/api/*` → `http://localhost:5000` automatically — no CORS issues.

### 3. Background Video
Put `spiral_edutrack.mp4` in `frontend/public/` folder.
It will auto-play on the landing page.

## Deploy to Vercel (Frontend)

```bash
cd frontend
vercel            # follow prompts
```

Set env vars in Vercel dashboard:
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_URL=https://edutrack-4b4o.onrender.com

## File Map

| File | What it is |
|------|-----------|
| `frontend/public/landing.html` | Your exact edutrack.html — served at `/` |
| `frontend/src/pages/Landing.jsx` | Wraps landing.html in iframe, wires CTAs to React Router |
| `frontend/src/pages/AuthPage.jsx` | Sign in / Sign up (Supabase) |
| `frontend/src/pages/Dashboard.jsx` | Subjects hub with readiness rings |
| `frontend/src/pages/MemoryPage.jsx` | SM-2 spaced repetition recall |
| `frontend/src/pages/ExamPage.jsx` | Past paper heatmap + trend chart |
| `frontend/src/pages/MasteryPage.jsx` | Teach-back + jargon dictionary |
| `frontend/src/pages/SyllabusPage.jsx` | AI syllabus analyser (Groq/Gemma) |
| `frontend/src/pages/ProfilePage.jsx` | Learner type + stats radar |
| `backend/app.py` | Flask entry point + CORS |
| `backend/routes/` | All API route blueprints |
| `schema.sql` | Full Supabase DB schema |
