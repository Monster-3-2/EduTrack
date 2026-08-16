import base64
import json
from flask import request

def get_user_id():
    """
    Pulls the user UUID from the Supabase JWT token sent by the frontend.
    Returns None if the token is missing or invalid.
    """
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Bearer '):
        return None
    try:
        token   = auth.split(' ')[1]
        payload = token.split('.')[1]
        # Pad base64 if needed
        payload += '=' * (-len(payload) % 4)
        data = json.loads(base64.b64decode(payload))
        return data.get('sub')
    except Exception:
        return None
