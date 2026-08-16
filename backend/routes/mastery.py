from flask import Blueprint, request, jsonify
from db    import get_conn
from logic import clarity_score

bp = Blueprint('mastery', __name__)


# ── Teach Mode / Explanations ─────────────────────────────

@bp.route('/explanation', methods=['POST'])
def save_explanation():
    data        = request.get_json()
    subtopic_id = data.get('subtopic_id')
    text        = data.get('explanation_text', '').strip()

    if not subtopic_id or not text:
        return jsonify({'error': 'subtopic_id and explanation_text required'}), 400

    score = clarity_score(text)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''INSERT INTO explanations (subtopic_id, explanation_text, clarity_score)
               VALUES (%s, %s, %s) RETURNING *''',
            (subtopic_id, text, score)
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify(dict(row)), 201


@bp.route('/history/<int:subtopic_id>', methods=['GET'])
def explanation_history(subtopic_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''SELECT e.*, st.name AS subtopic_name
               FROM explanations e
               JOIN subtopics st ON st.id = e.subtopic_id
               WHERE e.subtopic_id = %s
               ORDER BY e.created_at DESC''',
            (subtopic_id,)
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


# ── Jargon Dictionary ─────────────────────────────────────

@bp.route('/jargon', methods=['POST'])
def add_jargon():
    data       = request.get_json()
    subject_id = data.get('subject_id')
    word       = data.get('word', '').strip()
    definition = data.get('plain_definition', '').strip()

    if not all([subject_id, word, definition]):
        return jsonify({'error': 'subject_id, word, and plain_definition required'}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''INSERT INTO jargon_words (subject_id, word, plain_definition)
               VALUES (%s, %s, %s) RETURNING *''',
            (subject_id, word, definition)
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify(dict(row)), 201


@bp.route('/jargon/<int:subject_id>', methods=['GET'])
def get_jargon(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT * FROM jargon_words WHERE subject_id = %s ORDER BY created_at DESC',
            (subject_id,)
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@bp.route('/jargon/<int:jargon_id>', methods=['DELETE'])
def delete_jargon(jargon_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('DELETE FROM jargon_words WHERE id = %s', (jargon_id,))
        conn.commit()
    return jsonify({'deleted': jargon_id})
