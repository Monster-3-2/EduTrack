from flask import Blueprint, request, jsonify
from db     import get_conn
from logic  import sm2
from datetime import date

bp = Blueprint('recall', __name__)


@bp.route('', methods=['POST'])
def log_recall():
    data        = request.get_json()
    subtopic_id = data.get('subtopic_id')
    actual      = data.get('actual_score', 50)
    predicted   = data.get('predicted_score', 50)

    if not subtopic_id:
        return jsonify({'error': 'subtopic_id required'}), 400

    with get_conn() as conn, conn.cursor() as cur:
        # Fetch the last session to get SM-2 state
        cur.execute(
            '''SELECT ease_factor, interval_days, repetitions
               FROM recall_sessions
               WHERE subtopic_id = %s
               ORDER BY session_date DESC LIMIT 1''',
            (subtopic_id,)
        )
        last = cur.fetchone()

        ef       = last['ease_factor']   if last else 2.5
        interval = last['interval_days'] if last else 1
        reps     = last['repetitions']   if last else 0

        result = sm2(actual, ef, interval, reps)

        cur.execute(
            '''INSERT INTO recall_sessions
               (subtopic_id, predicted_score, actual_score,
                next_review_date, interval_days, ease_factor, repetitions)
               VALUES (%s, %s, %s, %s, %s, %s, %s) RETURNING *''',
            (subtopic_id, predicted, actual,
             result['next_date'], result['interval'],
             result['ease'],      result['reps'])
        )
        row = cur.fetchone()
        conn.commit()

    return jsonify(dict(row)), 201


@bp.route('/due-today', methods=['GET'])
def due_today():
    today = date.today().isoformat()

    with get_conn() as conn, conn.cursor() as cur:
        # Get the most recent session per subtopic and filter by next_review_date
        cur.execute(
            '''SELECT DISTINCT ON (rs.subtopic_id)
                  rs.*, st.name AS subtopic_name, s.name AS subject_name
               FROM recall_sessions rs
               JOIN subtopics st ON st.id = rs.subtopic_id
               JOIN subjects   s ON s.id  = st.subject_id
               WHERE rs.next_review_date <= %s
               ORDER BY rs.subtopic_id, rs.session_date DESC''',
            (today,)
        )
        rows = cur.fetchall()

    return jsonify([dict(r) for r in rows])


@bp.route('/mistakes', methods=['GET'])
def mistakes():
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            '''SELECT rs.*, st.name AS subtopic_name, s.name AS subject_name
               FROM recall_sessions rs
               JOIN subtopics st ON st.id = rs.subtopic_id
               JOIN subjects   s ON s.id  = st.subject_id
               WHERE rs.actual_score < 50
               ORDER BY rs.session_date DESC LIMIT 20'''
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])


@bp.route('/<int:subtopic_id>', methods=['GET'])
def history(subtopic_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            'SELECT * FROM recall_sessions WHERE subtopic_id = %s ORDER BY session_date',
            (subtopic_id,)
        )
        rows = cur.fetchall()
    return jsonify([dict(r) for r in rows])
