from flask import Blueprint, request, jsonify
from db   import get_conn
from auth import get_user_id

bp = Blueprint('subjects', __name__)


@bp.route('', methods=['GET'])
def list_subjects():
    uid = get_user_id()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT * FROM subjects WHERE user_id = %s ORDER BY created_at DESC',
            (uid,)
        )
        rows = cur.fetchall()

    return jsonify([dict(r) for r in rows])


@bp.route('', methods=['POST'])
def create_subject():
    uid = get_user_id()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    data = request.get_json()
    name      = data.get('name', '').strip()
    exam_date = data.get('exam_date') or None

    if not name:
        return jsonify({'error': 'Name is required'}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''INSERT INTO subjects (user_id, name, exam_date, readiness_score)
               VALUES (%s, %s, %s, 0) RETURNING *''',
            (uid, name, exam_date)
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify(dict(row)), 201


@bp.route('/<int:subject_id>', methods=['DELETE'])
def delete_subject(subject_id):
    uid = get_user_id()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'DELETE FROM subjects WHERE id = %s AND user_id = %s',
            (subject_id, uid)
        )
        conn.commit()

    return jsonify({'deleted': subject_id})
