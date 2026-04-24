# ══════════════════════════════════════════════════════════════════
# routes/syllabus.py
#
# CHANGED from previous version:
#   - Replaced Ollama (local LAN) with Groq cloud API
#   - GROQ_API_KEY read from env or passed per-request header
#   - Model: llama3-70b-8192 (free tier, fast)
#   - All text extraction logic unchanged
#   - All response structure unchanged (frontend unaffected)
# ══════════════════════════════════════════════════════════════════

import json, re, os, requests
from flask import Blueprint, request, jsonify

bp = Blueprint('syllabus', __name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama3-70b-8192"   # free tier — fast & capable


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

USER_PROMPT_TEMPLATE = """Analyse the syllabus/study-material below and return ONLY a valid JSON object.

Exam type context: {exam_type}
{exam_context}

Return JSON with this exact structure:
{{
  "topics": [
    {{
      "id": "t1",
      "name": "Topic name",
      "priority": "high|medium|low",
      "examFrequency": "Very likely|Likely|Sometimes|Rarely",
      "subtopics": ["subtopic 1", "subtopic 2"],
      "dependencies": ["prerequisite topic name"]
    }}
  ],
  "jargon": [
    {{
      "id": "j1",
      "word": "Technical term",
      "definition": "Plain-language explanation in one sentence"
    }}
  ],
  "knowledgeMap": {{
    "core":    ["core topic 1", "core topic 2"],
    "related": ["related concept 1"],
    "jargon":  ["key term 1", "key term 2"]
  }},
  "examInsight": "2-3 sentence paragraph about which topics are tested most in {exam_type} exams and what type of questions appear."
}}

Rules:
- priority = high if frequently tested in {exam_type}, medium if moderate, low if rare
- List 3-5 subtopics per main topic
- dependencies = topics the student must know BEFORE this one
- knowledgeMap.core = 5-8 most important topics
- knowledgeMap.jargon = top 6 jargon words

Syllabus text:
{text}"""


def call_groq(text: str, exam_type: str, api_key: str) -> dict:
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set. Add it to your .env file or pass it in the request.")

    prompt = USER_PROMPT_TEMPLATE.format(
        text=text[:8000],
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
        "temperature": 0.3,
        "max_tokens":  2048,
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

    # API key: env takes priority, fallback to per-request header (for dev)
    api_key = os.getenv('GROQ_API_KEY') or request.headers.get('X-Groq-Api-Key', '')

    # Extract text
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

    return jsonify({
        'exam_type':    exam_type,
        'subject_id':   subject_id,
        'topics':       result.get('topics', []),
        'jargon':       result.get('jargon', []),
        'knowledgeMap': result.get('knowledgeMap', {}),
        'examInsight':  result.get('examInsight', ''),
    })
