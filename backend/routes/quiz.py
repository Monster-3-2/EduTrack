# ══════════════════════════════════════════════════════════════════
# routes/quiz.py
# Generates 5 MCQ questions via Groq using the server-side API key.
# No key needed in the frontend — uses GROQ_API_KEY from .env
# ══════════════════════════════════════════════════════════════════

import json, re, os, requests
from flask import Blueprint, request, jsonify

bp = Blueprint('quiz', __name__)

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL   = "llama-3.3-70b-versatile"


def call_groq_quiz(subject: str, topic: str, api_key: str) -> list:
    if not api_key:
        raise ValueError("GROQ_API_KEY is not set in your backend .env file.")

    prompt = f"""You are a strict JSON API. Generate exactly 5 multiple-choice quiz questions about "{topic}" in the context of "{subject}".

Return ONLY a valid JSON array with no markdown, no explanation, no extra text. Format:
[
  {{
    "question": "Question text here?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct": 0,
    "explanation": "Brief explanation of why this answer is correct."
  }}
]

Rules:
- "correct" is the 0-based index of the correct option in "options"
- All 4 options must be plausible
- Questions must test understanding, not just recall
- Keep questions concise and unambiguous"""

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":       GROQ_MODEL,
        "messages":    [{"role": "user", "content": prompt}],
        "temperature": 0.7,
        "max_tokens":  2000,
    }

    r = requests.post(GROQ_API_URL, headers=headers, json=payload, timeout=60)

    if r.status_code == 401:
        raise ValueError("Invalid GROQ_API_KEY in your .env file.")
    if not r.ok:
        raise ValueError(f"Groq API error {r.status_code}: {r.text[:200]}")

    raw = r.json()["choices"][0]["message"]["content"]
    cleaned = re.sub(r"```json|```", "", raw).strip()
    questions = json.loads(cleaned)

    if not isinstance(questions, list) or len(questions) == 0:
        raise ValueError("Groq returned an unexpected format.")

    return questions


@bp.route('/generate', methods=['POST'])
def generate_quiz():
    data    = request.get_json(silent=True) or {}
    subject = data.get('subject', '').strip()
    topic   = data.get('topic', '').strip()

    if not subject or not topic:
        return jsonify({"error": "subject and topic are required"}), 400

    api_key = os.getenv('GROQ_API_KEY', '')

    try:
        questions = call_groq_quiz(subject, topic, api_key)
        return jsonify({"questions": questions})
    except ValueError as e:
        return jsonify({"error": str(e)}), 500
    except Exception as e:
        return jsonify({"error": f"Unexpected error: {str(e)}"}), 500
