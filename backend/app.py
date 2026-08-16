from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)

    allowed_origins = [
        r"https://edu-track.*\.vercel\.app",
        r"https://edutrack.*",
        r"http://localhost:\d+",
        r"http://127\.0\.0\.1:\d+",
    ]
    CORS(app,
         origins=allowed_origins,
         supports_credentials=True,
         allow_headers=["Authorization", "Content-Type", "X-Groq-Api-Key"],
         methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"])

    from routes.subjects  import bp as subjects_bp
    from routes.subtopics import bp as subtopics_bp
    from routes.recall    import bp as recall_bp
    from routes.exam      import bp as exam_bp
    from routes.mastery   import bp as mastery_bp
    from routes.dashboard import bp as dashboard_bp
    from routes.ml        import bp as ml_bp
    from routes.syllabus  import bp as syllabus_bp
    from routes.quiz      import bp as quiz_bp

    app.register_blueprint(subjects_bp,  url_prefix='/api/subjects')
    app.register_blueprint(subtopics_bp, url_prefix='/api/subtopics')
    app.register_blueprint(recall_bp,    url_prefix='/api/recall')
    app.register_blueprint(exam_bp,      url_prefix='/api/exam')
    app.register_blueprint(mastery_bp,   url_prefix='/api/mastery')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(ml_bp,        url_prefix='/api/ml')
    app.register_blueprint(syllabus_bp,  url_prefix='/api/syllabus')
    app.register_blueprint(quiz_bp,      url_prefix='/api/quiz')

    @app.route('/api/ping')
    def ping():
        return {'status': 'ok', 'version': '4.0.2-Void'}

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, port=5000)
