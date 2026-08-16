-- ══════════════════════════════════════════════════════════
-- MindMap Pro — Supabase Schema
-- Paste this entire file into Supabase → SQL Editor → Run
-- ══════════════════════════════════════════════════════════

-- Subjects
CREATE TABLE IF NOT EXISTS subjects (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name            VARCHAR(100) NOT NULL,
  exam_date       DATE,
  readiness_score INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Subtopics
CREATE TABLE IF NOT EXISTS subtopics (
  id         SERIAL PRIMARY KEY,
  subject_id INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  name       VARCHAR(200) NOT NULL,
  status     VARCHAR(20) DEFAULT 'not_started'
               CHECK (status IN ('studied','partial','not_started')),
  keywords   TEXT[] DEFAULT '{}',
  notes      TEXT,
  studied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recall sessions (SM-2 state stored per session)
CREATE TABLE IF NOT EXISTS recall_sessions (
  id               SERIAL PRIMARY KEY,
  subtopic_id      INTEGER NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  session_date     TIMESTAMPTZ DEFAULT NOW(),
  predicted_score  INTEGER CHECK (predicted_score BETWEEN 0 AND 100),
  actual_score     INTEGER CHECK (actual_score    BETWEEN 0 AND 100),
  next_review_date DATE NOT NULL,
  interval_days    INTEGER DEFAULT 1,
  ease_factor      FLOAT   DEFAULT 2.5,
  repetitions      INTEGER DEFAULT 0
);

-- Exam papers
CREATE TABLE IF NOT EXISTS exam_papers (
  id             SERIAL PRIMARY KEY,
  subject_id     INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  year           INTEGER,
  filename       VARCHAR(200),
  extracted_text TEXT,
  top_keywords   JSONB DEFAULT '[]',
  uploaded_at    TIMESTAMPTZ DEFAULT NOW()
);

-- Teach mode explanations
CREATE TABLE IF NOT EXISTS explanations (
  id               SERIAL PRIMARY KEY,
  subtopic_id      INTEGER NOT NULL REFERENCES subtopics(id) ON DELETE CASCADE,
  explanation_text TEXT NOT NULL,
  clarity_score    INTEGER DEFAULT 0,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Personal jargon dictionary
CREATE TABLE IF NOT EXISTS jargon_words (
  id               SERIAL PRIMARY KEY,
  subject_id       INTEGER NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  word             VARCHAR(100) NOT NULL,
  plain_definition TEXT NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ── Row Level Security ────────────────────────────────────
-- Users can only read/write their own data.

ALTER TABLE subjects     ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtopics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE recall_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exam_papers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE explanations ENABLE ROW LEVEL SECURITY;
ALTER TABLE jargon_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own subjects"      ON subjects     FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own subtopics"     ON subtopics    FOR ALL USING (subject_id IN (SELECT id FROM subjects WHERE user_id = auth.uid()));
CREATE POLICY "own recall"        ON recall_sessions FOR ALL USING (subtopic_id IN (SELECT st.id FROM subtopics st JOIN subjects s ON s.id=st.subject_id WHERE s.user_id=auth.uid()));
CREATE POLICY "own exam papers"   ON exam_papers  FOR ALL USING (subject_id IN (SELECT id FROM subjects WHERE user_id = auth.uid()));
CREATE POLICY "own explanations"  ON explanations FOR ALL USING (subtopic_id IN (SELECT st.id FROM subtopics st JOIN subjects s ON s.id=st.subject_id WHERE s.user_id=auth.uid()));
CREATE POLICY "own jargon"        ON jargon_words FOR ALL USING (subject_id IN (SELECT id FROM subjects WHERE user_id = auth.uid()));

-- ── Indexes ───────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_subtopics_subject   ON subtopics(subject_id);
CREATE INDEX IF NOT EXISTS idx_recall_subtopic     ON recall_sessions(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_recall_review_date  ON recall_sessions(next_review_date);
CREATE INDEX IF NOT EXISTS idx_exam_subject        ON exam_papers(subject_id);
CREATE INDEX IF NOT EXISTS idx_explanations_sub    ON explanations(subtopic_id);
CREATE INDEX IF NOT EXISTS idx_subjects_user       ON subjects(user_id);


-- ══════════════════════════════════════════════════════════════════
-- MIGRATION: AI Syllabus Module (NEW — added in update)
-- Run this block if you already have the schema above applied.
-- ══════════════════════════════════════════════════════════════════

-- Stores raw AI analysis results per syllabus upload
CREATE TABLE IF NOT EXISTS syllabus_analyses (
  id           SERIAL PRIMARY KEY,
  subject_id   INTEGER REFERENCES subjects(id) ON DELETE SET NULL,
  exam_type    VARCHAR(20) NOT NULL DEFAULT 'boards',
  raw_result   JSONB NOT NULL,          -- full Ollama response
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE syllabus_analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own syllabus analyses"
  ON syllabus_analyses FOR ALL
  USING (
    subject_id IS NULL
    OR subject_id IN (SELECT id FROM subjects WHERE user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_syllabus_subject ON syllabus_analyses(subject_id);

-- Add exam_type column to subjects so the chosen exam context persists
ALTER TABLE subjects ADD COLUMN IF NOT EXISTS exam_type VARCHAR(20) DEFAULT 'boards';
