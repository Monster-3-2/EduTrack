from flask import Blueprint, request, jsonify
from db    import get_conn
from logic import top_keywords, question_type_split
import io, json, re
import fitz as pymupdf  # PyMuPDF

bp = Blueprint('exam', __name__)

# ── Heuristic: detect if extracted text is mostly garbage ─────────
GARBAGE_RATIO_THRESHOLD = 0.4  # if >40% tokens are garbage, fall back to OCR

KNOWN_GARBAGE = {
    'dejavusans','dejavuserif','dejavumono','reportlab','opensource',
    'generated','document','anonymous','unspecified','undefined',
    'monospace','helvetica','courier','arial','bold','italic','roman',
    'light','medium','heavy','black','thin','normal',
}

def _is_corrupted(text: str) -> bool:
    """
    Returns True if text has a high ratio of garbage tokens —
    font subset tags, metadata words, unmapped glyph runs.
    """
    if not text or len(text) < 20:
        return True
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text)
    if not words:
        return True
    garbage_count = sum(
        1 for w in words
        if w.lower() in KNOWN_GARBAGE
        or re.match(r'^[bcdfghjklmnpqrstvwxyz]{4,}$', w.lower())  # no vowels = font tag
        or re.match(r'^(.)\1{3,}$', w)                              # repeated char = oooooo
        or re.match(r'^[A-Z]{6}\+', w)                              # subset prefix ABCDEF+
    )
    return (garbage_count / len(words)) > GARBAGE_RATIO_THRESHOLD


def _extract_text(file_bytes: bytes) -> str:
    """
    Extract plain text from PDF using PyMuPDF.
    - Problem 1: Iterates over pages explicitly
    - Problem 2: Uses get_text('blocks'), filters to text-only blocks (type 0)
                 which skips image blocks and avoids font/metadata dumps
    - Problem 3: Detects corrupted/scanned pages and falls back to OCR
    - Problem 4: Guards every extraction with (... or '') null safety
    """
    try:
        doc = pymupdf.open(stream=file_bytes, filetype='pdf')
        pages_text = []

        for page in doc:
            # Problem 2: use 'blocks' mode, keep only text blocks (block_type == 0)
            # This skips image descriptors, font dicts, and vector metadata
            blocks = page.get_text('blocks') or []
            page_text = '\n'.join(
                (b[4] or '').strip()
                for b in blocks
                if b[6] == 0 and (b[4] or '').strip()  # block_type 0 = text only
            ).strip()

            # Problem 3: if page text is empty or corrupted, OCR this page
            if not page_text or _is_corrupted(page_text):
                page_text = _ocr_page(page) or page_text  # keep original if OCR also fails

            # Problem 4: null safety — only append non-empty strings
            if page_text:
                pages_text.append(page_text)

        doc.close()
        return ' '.join(pages_text)[:60000]

    except Exception:
        # Last resort OCR on whole file
        return _ocr_file(file_bytes)[:60000]


def _ocr_page(page) -> str:
    """Render a single PyMuPDF page to image and OCR it."""
    try:
        import pytesseract
        from PIL import Image
        pix = page.get_pixmap(dpi=300)
        img = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        return (pytesseract.image_to_string(img) or '').strip()
    except Exception:
        return ''


def _ocr_file(file_bytes: bytes) -> str:
    """OCR fallback for entire file (when PyMuPDF can't open it at all)."""
    try:
        from pdf2image import convert_from_bytes
        import pytesseract
        images = convert_from_bytes(file_bytes, dpi=200)
        return ' '.join(
            (pytesseract.image_to_string(img) or '').strip()
            for img in images
        )
    except Exception:
        return ''


@bp.route('/upload/<int:subject_id>', methods=['POST'])
def upload(subject_id):
    if 'file' not in request.files:
        return jsonify({'error': 'No file attached'}), 400

    file    = request.files['file']
    year    = int(request.form.get('year', 0)) or None
    fname   = file.filename

    text    = _extract_text(file.read())
    kws     = top_keywords(text, 20)
    kw_json = [{'word': w, 'freq': f} for w, f in kws]
    qtypes  = question_type_split(text)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''INSERT INTO exam_papers
               (subject_id, year, filename, extracted_text, top_keywords)
               VALUES (%s, %s, %s, %s, %s) RETURNING *''',
            (subject_id, year, fname, text, json.dumps(kw_json))
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify({**dict(row), 'question_types': qtypes}), 201


@bp.route('/papers/<int:subject_id>', methods=['GET'])
def list_papers(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT id, year, filename, uploaded_at FROM exam_papers WHERE subject_id = %s ORDER BY year DESC',
            (subject_id,)
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@bp.route('/heatmap/<int:subject_id>', methods=['GET'])
def heatmap(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT extracted_text FROM exam_papers WHERE subject_id = %s',
            (subject_id,)
        )
        rows = cur.fetchall()

    # Problem 4: guard against None in stored text
    all_text = ' '.join((r['extracted_text'] or '') for r in rows)
    kws      = top_keywords(all_text, 20)
    qtypes   = question_type_split(all_text)

    return jsonify({
        'keywords':       [{'word': w, 'freq': f} for w, f in kws],
        'question_types': qtypes,
        'paper_count':    len(rows),
    })


@bp.route('/trends/<int:subject_id>', methods=['GET'])
def trends(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT year, top_keywords FROM exam_papers WHERE subject_id = %s ORDER BY year',
            (subject_id,)
        )
        rows = cur.fetchall()
    return jsonify([
        {'year': r['year'], 'keyword_count': len(r['top_keywords'] or [])}
        for r in rows
    ])


@bp.route('/papers/<int:paper_id>', methods=['DELETE'])
def delete_paper(paper_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('DELETE FROM exam_papers WHERE id = %s RETURNING id', (paper_id,))
        row = cur.fetchone()
        conn.commit()
    if row:
        return jsonify({'deleted': paper_id}), 200
    return jsonify({'error': 'Not found'}), 404
