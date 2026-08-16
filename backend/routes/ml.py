from flask import Blueprint, request, jsonify
from db    import get_conn
from logic import detect_learner_type, personalised_hint
from auth  import get_user_id

bp = Blueprint('ml', __name__)


@bp.route('/profile', methods=['GET'])
def get_profile():
    uid = get_user_id()
    if not uid:
        return jsonify({'error': 'Unauthorized'}), 401

    with get_conn() as conn, conn.cursor() as cur:
        # Total recall sessions for this user
        cur.execute(
            '''SELECT COUNT(*) AS cnt FROM recall_sessions rs
               JOIN subtopics st ON st.id = rs.subtopic_id
               JOIN subjects  s  ON s.id  = st.subject_id
               WHERE s.user_id = %s''',
            (uid,)
        )
        total_sessions = cur.fetchone()['cnt'] or 0

        # Avg clarity from teach mode
        cur.execute(
            '''SELECT AVG(e.clarity_score) AS avg_clarity
               FROM explanations e
               JOIN subtopics st ON st.id = e.subtopic_id
               JOIN subjects  s  ON s.id  = st.subject_id
               WHERE s.user_id = %s''',
            (uid,)
        )
        avg_clarity = float(cur.fetchone()['avg_clarity'] or 0)

        # Has any exam papers?
        cur.execute(
            '''SELECT COUNT(*) AS cnt FROM exam_papers ep
               JOIN subjects s ON s.id = ep.subject_id
               WHERE s.user_id = %s''',
            (uid,)
        )
        has_exam_papers = cur.fetchone()['cnt'] > 0

        # Confidence bias
        cur.execute(
            '''SELECT AVG(predicted_score - actual_score) AS bias
               FROM recall_sessions rs
               JOIN subtopics st ON st.id = rs.subtopic_id
               JOIN subjects  s  ON s.id  = st.subject_id
               WHERE s.user_id = %s''',
            (uid,)
        )
        bias = round(float(cur.fetchone()['bias'] or 0), 1)

    learner_type = detect_learner_type(total_sessions, avg_clarity, has_exam_papers)

    return jsonify({
        'learner_type':    learner_type,
        'total_sessions':  total_sessions,
        'avg_clarity':     round(avg_clarity, 1),
        'confidence_bias': bias,
    })


@bp.route('/hint/<int:subtopic_id>', methods=['GET'])
def get_hint(subtopic_id):
    uid   = get_user_id()
    topic = request.args.get('topic', 'this topic')

    # Default learner type
    learner_type = {'visual': 0.33, 'conceptual': 0.33, 'repetition': 0.34}

    if uid:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                '''SELECT COUNT(*) AS cnt FROM recall_sessions rs
                   JOIN subtopics st ON st.id = rs.subtopic_id
                   JOIN subjects  s  ON s.id  = st.subject_id
                   WHERE s.user_id = %s''',
                (uid,)
            )
            total = cur.fetchone()['cnt'] or 0

            cur.execute(
                '''SELECT AVG(e.clarity_score) AS avg_c
                   FROM explanations e
                   JOIN subtopics st ON st.id = e.subtopic_id
                   JOIN subjects  s  ON s.id  = st.subject_id
                   WHERE s.user_id = %s''',
                (uid,)
            )
            avg_c = float(cur.fetchone()['avg_c'] or 0)

            cur.execute(
                '''SELECT COUNT(*) AS cnt FROM exam_papers ep
                   JOIN subjects s ON s.id = ep.subject_id
                   WHERE s.user_id = %s''',
                (uid,)
            )
            has_papers = cur.fetchone()['cnt'] > 0

        learner_type = detect_learner_type(total, avg_c, has_papers)

    hint     = personalised_hint(learner_type, topic)
    dominant = max(learner_type, key=learner_type.get)

    return jsonify({'hint': hint, 'dominant_type': dominant})
