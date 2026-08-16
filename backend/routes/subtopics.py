from flask import Blueprint, request, jsonify
from db   import get_conn
from datetime import datetime

bp = Blueprint('subtopics', __name__)


@bp.route('/<int:subject_id>', methods=['GET'])
def list_subtopics(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT * FROM subtopics WHERE subject_id = %s ORDER BY created_at',
            (subject_id,)
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@bp.route('', methods=['POST'])
def create_subtopic():
    data     = request.get_json()
    name     = data.get('name', '').strip()
    subject_id = data.get('subject_id')
    notes    = data.get('notes', '')
    keywords = data.get('keywords', [])

    if not name or not subject_id:
        return jsonify({'error': 'name and subject_id are required'}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''INSERT INTO subtopics (subject_id, name, notes, keywords, status)
               VALUES (%s, %s, %s, %s, 'not_started') RETURNING *''',
            (subject_id, name, notes, keywords)
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify(dict(row)), 201


@bp.route('/<int:subtopic_id>/status', methods=['PATCH'])
def update_status(subtopic_id):
    data   = request.get_json()
    status = data.get('status')

    if status not in ('studied', 'partial', 'not_started'):
        return jsonify({'error': 'Invalid status'}), 400

    studied_at = datetime.utcnow().isoformat() if status == 'studied' else None

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'UPDATE subtopics SET status = %s, studied_at = %s WHERE id = %s RETURNING *',
            (status, studied_at, subtopic_id)
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify(dict(row))


@bp.route('/<int:subtopic_id>', methods=['DELETE'])
def delete_subtopic(subtopic_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('DELETE FROM subtopics WHERE id = %s', (subtopic_id,))
        conn.commit()
    return jsonify({'deleted': subtopic_id})
