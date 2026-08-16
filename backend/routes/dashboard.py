from flask import Blueprint, jsonify
from db    import get_conn
from logic import readiness_score, priority_list, top_keywords
from auth  import get_user_id
from datetime import date, timedelta

bp = Blueprint('dashboard', __name__)


@bp.route('/readiness/<int:subject_id>', methods=['GET'])
def readiness(subject_id):
    with get_conn() as conn, conn.cursor() as cur:

        # Subject + exam date
        cur.execute('SELECT * FROM subjects WHERE id = %s', (subject_id,))
        subject = cur.fetchone()
        if not subject:
            return jsonify({'error': 'Not found'}), 404

        # Coverage %
        cur.execute('SELECT status FROM subtopics WHERE subject_id = %s', (subject_id,))
        all_topics = cur.fetchall()
        total      = len(all_topics) or 1
        studied    = sum(1 for t in all_topics if t['status'] == 'studied')
        coverage   = studied / total * 100

        # Avg recall (latest session per subtopic)
        cur.execute(
            '''SELECT DISTINCT ON (subtopic_id) actual_score
               FROM recall_sessions rs
               JOIN subtopics st ON st.id = rs.subtopic_id
               WHERE st.subject_id = %s
               ORDER BY subtopic_id, session_date DESC''',
            (subject_id,)
        )
        scores    = [r['actual_score'] for r in cur.fetchall()]
        avg_recall = sum(scores) / len(scores) if scores else 50

        # Exam match — how many high-freq exam words appear in studied topic names
        cur.execute('SELECT extracted_text FROM exam_papers WHERE subject_id = %s', (subject_id,))
        papers    = cur.fetchall()
        all_text  = ' '.join(r['extracted_text'] or '' for r in papers)
        top_kws   = set(w for w, _ in top_keywords(all_text, 10))
        studied_names = ' '.join(
            t['name'].lower() for t in all_topics if t['status'] == 'studied'
        )
        matched   = sum(1 for k in top_kws if k in studied_names)
        exam_match= matched / max(len(top_kws), 1) * 100

        score = readiness_score(coverage, avg_recall, exam_match)

        # Persist the score back to subjects table
        cur.execute(
            'UPDATE subjects SET readiness_score = %s WHERE id = %s',
            (int(score), subject_id)
        )
        conn.commit()

    return jsonify({
        'readiness_score': score,
        'coverage':        round(coverage, 1),
        'avg_recall':      round(avg_recall, 1),
        'exam_match':      round(exam_match, 1),
    })


@bp.route('/priority/<int:subject_id>', methods=['GET'])
def priority(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('SELECT exam_date FROM subjects WHERE id = %s', (subject_id,))
        subject   = cur.fetchone()
        exam_date = subject['exam_date'] if subject else None

        cur.execute('SELECT * FROM subtopics WHERE subject_id = %s', (subject_id,))
        subtopics = cur.fetchall()

        cur.execute('SELECT extracted_text FROM exam_papers WHERE subject_id = %s', (subject_id,))
        papers    = cur.fetchall()

    all_text = ' '.join(r['extracted_text'] or '' for r in papers)
    kw_freq  = dict(top_keywords(all_text, 20))
    max_freq = max(kw_freq.values(), default=1)

    items = []
    for st in subtopics:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                '''SELECT actual_score FROM recall_sessions
                   WHERE subtopic_id = %s ORDER BY session_date DESC LIMIT 1''',
                (st['id'],)
            )
            last = cur.fetchone()

        decay = last['actual_score'] if last else 50
        # Check if any keyword for this topic appears in exam papers
        name_words = st['name'].lower().split()
        freq       = max((kw_freq.get(w, 0) for w in name_words), default=0)

        items.append({
            'id':             st['id'],
            'name':           st['name'],
            'status':         st['status'],
            'decay_score':    decay,
            'exam_frequency': round(freq / max_freq * 100),
        })

    return jsonify({'priority_list': priority_list(items, exam_date)})


@bp.route('/weekly/<int:subject_id>', methods=['GET'])
def weekly(subject_id):
    week_ago = date.today() - timedelta(days=7)

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute('SELECT id, name FROM subtopics WHERE subject_id = %s', (subject_id,))
        subtopics = cur.fetchall()

    improved, decayed, gaps = [], [], []

    for st in subtopics:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                '''SELECT actual_score FROM recall_sessions
                   WHERE subtopic_id = %s ORDER BY session_date DESC LIMIT 2''',
                (st['id'],)
            )
            sessions = cur.fetchall()

        if len(sessions) >= 2:
            delta = sessions[0]['actual_score'] - sessions[1]['actual_score']
            if delta >  10: improved.append(st['name'])
            if delta < -10: decayed.append(st['name'])

        with get_conn() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT status FROM subtopics WHERE id = %s",
                (st['id'],)
            )
            s = cur.fetchone()
        if s and s['status'] == 'not_started':
            gaps.append(st['name'])

    return jsonify({
        'week_start':        week_ago.isoformat(),
        'most_improved':     improved[:3],
        'most_decayed':      decayed[:3],
        'top_gaps':          gaps[:5],
        'recommended_focus': (decayed + gaps)[:3],
    })


@bp.route('/gap-alert/<int:subject_id>', methods=['GET'])
def gap_alert(subject_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "SELECT id, name, status FROM subtopics WHERE subject_id = %s AND status != 'studied'",
            (subject_id,)
        )
        unstudied = cur.fetchall()

        cur.execute('SELECT extracted_text FROM exam_papers WHERE subject_id = %s', (subject_id,))
        papers = cur.fetchall()

    all_text = ' '.join(r['extracted_text'] or '' for r in papers)
    top_kws  = [w for w, _ in top_keywords(all_text, 15)]

    alerts = []
    for st in unstudied:
        name_lower = st['name'].lower()
        if any(k in name_lower or name_lower in k for k in top_kws):
            alerts.append({
                'topic':  st['name'],
                'status': st['status'],
                'risk':   'Appears in exam papers but not yet studied',
            })

    return jsonify({'alerts': alerts})
