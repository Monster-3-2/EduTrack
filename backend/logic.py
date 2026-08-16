"""
All pure logic — no Flask, no DB.
Every route file imports from here.
"""

import re
from collections import Counter
from datetime import date, timedelta


# ─────────────────────────────────────────────────────────
# SM-2  (Spaced Repetition)
# ─────────────────────────────────────────────────────────

def sm2(score: int, ease: float, interval: int, reps: int):
    q = round(score / 20)
    if q < 3:
        new_interval = 1
        new_reps     = 0
    else:
        if reps == 0:   new_interval = 1
        elif reps == 1: new_interval = 6
        else:           new_interval = round(interval * ease)
        new_reps = reps + 1
    new_ease  = max(1.3, ease + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
    next_date = (date.today() + timedelta(days=new_interval)).isoformat()
    return {'interval': new_interval, 'ease': round(new_ease, 3), 'reps': new_reps, 'next_date': next_date}


# ─────────────────────────────────────────────────────────
# Readiness Score
# ─────────────────────────────────────────────────────────

def readiness_score(coverage_pct: float, avg_recall: float, exam_match_pct: float) -> float:
    return round(avg_recall * 0.40 + coverage_pct * 0.30 + exam_match_pct * 0.30, 1)


# ─────────────────────────────────────────────────────────
# Priority Engine
# ─────────────────────────────────────────────────────────

def priority_list(subtopics: list, exam_date=None) -> list:
    days_left     = (exam_date - date.today()).days if exam_date else 30
    urgency       = max(1.0, 10 / max(days_left, 1))
    status_weight = {'not_started': 1.5, 'partial': 1.2, 'studied': 1.0}
    for s in subtopics:
        decay_urgency   = (100 - s.get('decay_score', 50)) / 100
        exam_importance = s.get('exam_frequency', 50) / 100
        coverage_weight = status_weight.get(s.get('status', 'not_started'), 1.0)
        s['priority_score'] = round(
            (decay_urgency * 0.4 + exam_importance * 0.4 + (coverage_weight - 1) * 0.2)
            * urgency * 100, 1
        )
    return sorted(subtopics, key=lambda x: x['priority_score'], reverse=True)[:5]


# ─────────────────────────────────────────────────────────
# PDF / Text Analysis
# ─────────────────────────────────────────────────────────

STOPWORDS = {
    # common English function words
    'that','this','with','from','have','been','they','your','will','also','each',
    'which','when','what','where','how','the','and','for','are','was','its','not',
    'but','can','all','one','more','their','has','or','at','by','an','be','if',
    'as','it','in','of','to','a','is','then','than','into','over','such','these',
    'those','about','after','before','between','during','should','would','could',
    'used','using','based','given','show','shown','shows','well','very','often',
    'may','both','just','even','other','some','most','much','many','make','made',
    'take','taken','come','comes','know','known','need','needs','work','works',
    # PDF structure / font / metadata artifacts
    'true','false','null','none','type','name','value','data','text','size',
    'page','pages','font','width','height','color','style','class','block',
    'display','normal','bold','italic','roman','light','medium','heavy','black',
    'thin','left','right','center','auto','inline','object','stream','array',
    'endobj','xref','startxref','trailer','creator','producer','author','title',
    # ReportLab / font library names (the main culprits)
    'dejavusans','dejavuserif','dejavumono','reportlab','opensource','generated',
    'document','anonymous','unspecified','undefined','monospace','helvetica',
    'courier','arial','calibri','verdana','tahoma','georgia','unicode','ascii',
    'latin','glyph','kern','char','rect','bbox','proc','endstream',
    # garbled glyph tokens seen in actual output
    'gatus','gcsmodt','eroq','gatm','xmmkqb',
    # generic doc structure words
    'section','figure','appendix','chapter','index','contents','references',
    'bibliography','abstract','introduction','conclusion','overview','summary',
    # MathML / XML junk
    'mrow','mover','mfrac','msqrt','mtext','mspace','mtable','mstyle',
    'mathvariant','accent','fence','stretchy','xmlns','math','xlink','href',
    'encoding','version','doctype','html','head','body','span','nbsp','amp',
}

# Matches known PDF artifact token patterns
ARTIFACT_PATTERN = re.compile(
    r'\b(obj|ref|xref|bbox|rect|proc|dict|endstream|startxref)\b'
)

# A word is garbage if it has no vowels or is all one repeated character
VOWELS = set('aeiou')

def _is_real_word(w: str) -> bool:
    """Return True only if the word looks like a real English/scientific word."""
    # Must contain at least 2 vowels
    vowel_count = sum(1 for c in w if c in VOWELS)
    if vowel_count < 2:
        return False
    # Must not be all one character repeated (e.g. 'oooooooo')
    if len(set(w)) <= 2:
        return False
    # Must not be a known artifact pattern
    if ARTIFACT_PATTERN.search(w):
        return False
    return True

QUESTION_WORDS = {
    'application': ['calculate','solve','apply','derive','find','determine','compute','evaluate'],
    'definition':  ['define','explain','describe','state','discuss','outline','list','identify'],
}

def top_keywords(text: str, n: int = 20) -> list:
    """Returns list of (word, frequency) tuples of meaningful keywords only."""
    words = re.findall(r'\b[a-z]{4,20}\b', text.lower())
    filtered = [
        w for w in words
        if w not in STOPWORDS
        and _is_real_word(w)
        and not w.isdigit()
    ]
    counts = Counter(filtered)
    # Only return words appearing more than once — single occurrences are usually noise
    meaningful = [(w, f) for w, f in counts.most_common(n * 4) if f > 1]
    return meaningful[:n]

def question_type_split(text: str) -> dict:
    """Returns % of application vs definition question words found."""
    lower  = text.lower()
    counts = {k: sum(lower.count(w) for w in words) for k, words in QUESTION_WORDS.items()}
    total  = sum(counts.values()) or 1
    return {k: round(v / total * 100) for k, v in counts.items()}


# ─────────────────────────────────────────────────────────
# Clarity Score
# ─────────────────────────────────────────────────────────

JARGON = [
    'wherein','furthermore','subsequently','aforementioned','notwithstanding',
    'utilize','paradigm','leverage','synergy','heretofore','henceforth',
]

def clarity_score(text: str) -> int:
    if not text or len(text) < 20:
        return 0
    sentences = [s.strip() for s in re.split(r'[.!?]+', text) if len(s.strip()) > 3]
    if not sentences:
        return 0
    avg_len      = sum(len(s.split()) for s in sentences) / len(sentences)
    jargon_hits  = sum(1 for j in JARGON if j in text.lower())
    length_score = max(0, 100 - max(0, avg_len - 12) * 4)
    jargon_score = max(0, 100 - jargon_hits * 15)
    return round(length_score * 0.6 + jargon_score * 0.4)


# ─────────────────────────────────────────────────────────
# ML — Learner Type
# ─────────────────────────────────────────────────────────

def detect_learner_type(total_sessions: int, avg_clarity: float, has_exam_papers: bool) -> dict:
    visual      = 60 if has_exam_papers else 20
    conceptual  = avg_clarity
    repetition  = min(100, total_sessions * 3)
    total       = visual + conceptual + repetition or 1
    return {
        'visual':     round(visual     / total, 2),
        'conceptual': round(conceptual / total, 2),
        'repetition': round(repetition / total, 2),
    }


# ─────────────────────────────────────────────────────────
# ML — Personalised Explanation Hints
# ─────────────────────────────────────────────────────────

HINTS = {
    'visual':      'Before writing, picture {topic} as a diagram or flowchart. What does the structure look like?',
    'conceptual':  'Before recalling facts, ask yourself: WHY does {topic} work this way? Start with the core principle.',
    'repetition':  'You have seen this before. List every fact you remember about {topic} without stopping — then check what you missed.',
}

def personalised_hint(learner_type: dict, topic: str) -> str:
    dominant = max(learner_type, key=learner_type.get)
    return HINTS.get(dominant, HINTS['conceptual']).replace('{topic}', topic)
