# ══════════════════════════════════════════════════════════════════
# routes/syllabus.py
#
# CHANGED from previous version:
#   - Replaced Ollama (local LAN) with Groq cloud API
#   - GROQ_API_KEY read from env or passed per-request header
#   - Model: gemma 4 (free tier, fast)
#   - All text extraction logic unchanged
#   - All response structure unchanged (frontend unaffected)
# ══════════════════════════════════════════════════════════════════

import json, re, os, requests
from flask import Blueprint, request, jsonify

bp = Blueprint('syllabus', __name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.1-8b-instant"  # FIX #2: switched to Gemma model


# ── Text extractors (unchanged) ────────────────────────────────────

def extract_from_file(f) -> str:
    name = f.filename.lower()
    raw  = f.read()

    if name.endswith('.txt'):
        return raw.decode('utf-8', errors='ignore')

    if name.endswith('.pdf'):
        try:
            import io
            from pypdf import PdfReader
            reader = PdfReader(io.BytesIO(raw))
            return '\n'.join(p.extract_text() or '' for p in reader.pages)
        except Exception as e:
            return f'[PDF extraction failed: {e}]'

    if name.endswith('.docx'):
        try:
            import io, zipfile, xml.etree.ElementTree as ET
            buf = io.BytesIO(raw)
            with zipfile.ZipFile(buf) as z:
                xml_content = z.read('word/document.xml')
            root = ET.fromstring(xml_content)
            ns   = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            return ' '.join(t.text or '' for t in root.findall('.//w:t', ns))
        except Exception as e:
            return f'[DOCX extraction failed: {e}]'

    return raw.decode('utf-8', errors='ignore')


def extract_from_url(url: str) -> str:
    try:
        r = requests.get(url, timeout=15, headers={'User-Agent': 'Mozilla/5.0'})
        r.raise_for_status()
        text = re.sub(r'<[^>]+>', ' ', r.text)
        text = re.sub(r'\s+', ' ', text)
        return text[:12000]
    except Exception as e:
        return f'[URL fetch failed: {e}]'


# ── Groq API call ──────────────────────────────────────────────────

EXAM_CONTEXTS = {
    'jee':    'JEE Main & Advanced (Indian engineering entrance). Weight: Maths, Physics, Chemistry — problem-solving, derivations, numericals.',
    'neet':   'NEET (Indian medical entrance). Weight: Biology (50%), Physics & Chemistry — theory, diagrams, MCQs.',
    'boards': 'CBSE/ICSE/State Boards. Weight: theory + numericals + diagrams; NCERT-based; definition & explanation questions.',
    'upsc':   'UPSC Civil Services. Weight: conceptual understanding, current affairs linkage, essay-style answers.',
    'cat':    'CAT MBA entrance. Weight: quantitative aptitude, verbal reasoning, data interpretation.',
    'other':  'General exam preparation. Balance theory and application.',
}

SYSTEM_PROMPT = "You are an expert study coach. You return ONLY valid JSON — no markdown fences, no commentary, no extra text whatsoever."

USER_PROMPT_TEMPLATE = """You are analysing a student's actual uploaded document. Extract topics ONLY from the text provided below. Do NOT use any prior knowledge, do NOT invent topics, do NOT assume the subject — read only what is in the text.

Exam type: {exam_type}
{exam_context}

Return ONLY a valid JSON object with this exact structure:
{{
  "topics": [
    {{
      "id": "t1",
      "name": "Topic name extracted from the text",
      "priority": "high|medium|low",
      "examFrequency": "Very likely|Likely|Sometimes|Rarely",
      "subtopics": ["subtopic 1 from text", "subtopic 2 from text"],
      "dependencies": ["prerequisite topic name from text"]
    }}
  ],
  "jargon": [
    {{
      "id": "j1",
      "word": "Technical term found in the text",
      "definition": "Plain-language explanation in one sentence"
    }}
  ],
  "knowledgeMap": {{
    "core":    ["core topic 1", "core topic 2"],
    "related": ["related concept 1"],
    "jargon":  ["key term 1", "key term 2"]
  }},
  "examInsight": "2-3 sentences about the topics found in THIS document and how they relate to {exam_type} exams."
}}

STRICT RULES:
- Extract topics ONLY from the syllabus text below — do NOT hallucinate or add topics not present in the text
- If the text is about Java programming, return Java topics. If it is about physics, return physics topics. Follow the text.
- priority = high if the topic appears frequently or prominently in the text
- List 3-5 subtopics per main topic, taken directly from the text
- dependencies = topics the student must know BEFORE this one, based on the text structure
- knowledgeMap.core = 5-8 most important topics FROM THE TEXT
- knowledgeMap.jargon = top 6 technical terms FROM THE TEXT

Syllabus text:
{text}"""


def call_groq(text: str, exam_type: str, api_key: str) -> dict:
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Add it to your .env file or pass it in the request.")

    prompt = USER_PROMPT_TEMPLATE.format(
        text=text[:4000],
        exam_type=exam_type.upper(),
        exam_context=EXAM_CONTEXTS.get(exam_type, EXAM_CONTEXTS['other']),
    )

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":    GROQ_MODEL,
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user",   "content": prompt},
        ],
        "temperature": 0.2,
        "max_tokens": 4096,
    }

    try:
        r = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)
    except requests.exceptions.Timeout:
        raise ConnectionError("Groq API request timed out. Try again.")
    except requests.exceptions.ConnectionError as e:
        raise ConnectionError(f"Could not reach Groq API: {e}")

    if r.status_code == 401:
        raise ValueError("Invalid GROQ_API_KEY. Check your .env file.")
    if r.status_code == 429:
        raise ValueError("Groq rate limit hit. Wait a moment and try again.")
    if not r.ok:
        raise ValueError(f"Groq API error {r.status_code}: {r.text[:200]}")

    raw = r.json()["choices"][0]["message"]["content"].strip()
    # Strip any accidental markdown fences
    raw = re.sub(r'^```[a-z]*\n?', '', raw)
    raw = re.sub(r'\n?```$', '', raw)

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise ValueError(f"Groq returned invalid JSON: {e}\nRaw: {raw[:300]}")


# ── Endpoint ───────────────────────────────────────────────────────

@bp.route('/analyse', methods=['POST'])
def analyse_syllabus():
    exam_type  = request.form.get('exam_type', 'boards')
    subject_id = request.form.get('subject_id')

    api_key = os.getenv('GROQ_API_KEY') or request.headers.get('X-Groq-Api-Key', '')

    raw_text = ''
    if 'file' in request.files:
        raw_text = extract_from_file(request.files['file'])
    elif request.form.get('text'):
        raw_text = request.form['text']
    elif request.form.get('url'):
        raw_text = extract_from_url(request.form['url'])
    else:
        return jsonify({'error': 'No syllabus content provided.'}), 400

    if not raw_text.strip():
        return jsonify({'error': 'Could not extract any text from the provided source.'}), 400

    try:
        result = call_groq(raw_text, exam_type, api_key)
    except (ConnectionError, ValueError) as e:
        return jsonify({'error': str(e)}), 503
    except Exception as e:
        return jsonify({'error': f'Unexpected error: {e}'}), 500

    # ── Auto-save analysis to syllabus_analyses ──
    try:
        import psycopg2, json
        from db import get_conn
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                '''INSERT INTO syllabus_analyses (subject_id, exam_type, raw_result)
                   VALUES (%s, %s, %s)''',
                (int(subject_id) if subject_id else None,
                 exam_type,
                 json.dumps(result))
            )
            # ── Auto-save jargon to jargon_words ──
            if subject_id and result.get('jargon'):
                for j in result['jargon']:
                    cur.execute(
                        '''INSERT INTO jargon_words (subject_id, word, plain_definition)
                           VALUES (%s, %s, %s)
                           ON CONFLICT DO NOTHING''',
                        (int(subject_id), j.get('word', ''), j.get('definition', ''))
                    )
            conn.commit()
    except Exception as e:
        # Don't fail the request if DB save fails — just log it
        print(f'[syllabus] DB save error: {e}')

    return jsonify({
        'exam_type':    exam_type,
        'subject_id':   subject_id,
        'topics':       result.get('topics', []),
        'jargon':       result.get('jargon', []),
        'knowledgeMap': result.get('knowledgeMap', {}),
        'examInsight':  result.get('examInsight', ''),
    })
