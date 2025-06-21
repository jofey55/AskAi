import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from openai_client import OpenAIClient
from models import db, InterviewSession, SessionInteraction

# Configure logging
logging.basicConfig(level=logging.DEBUG)

app = Flask(__name__)
app.secret_key = os.environ.get("SESSION_SECRET", "interview_assistant_secret_key")

# Database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL')
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_recycle': 300,
    'pool_pre_ping': True,
}
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Initialize database
db.init_app(app)

# Initialize OpenAI client
openai_client = OpenAIClient()

# Create tables
with app.app_context():
    db.create_all()

@app.route('/')
def index():
    """Main page with the interview assistant interface"""
    return render_template('index_basic.html')

@app.route('/send_question', methods=['POST'])
def send_question():
    """Send question to OpenAI and get answer"""
    try:
        data = request.get_json()
        question = data.get('question', '').strip()
        
        if not question:
            return jsonify({
                'success': False,
                'message': 'Question cannot be empty'
            }), 400
        
        # Get answer from OpenAI
        answer = openai_client.generate_answer(question)
        
        # Save to active session if one exists
        session_id = session.get('active_session_id')
        if session_id:
            try:
                active_session = InterviewSession.query.get(session_id)
                if active_session and active_session.is_active:
                    interaction_order = len(active_session.interactions) + 1
                    interaction = SessionInteraction(
                        session_id=session_id,
                        question=question,
                        answer=answer,
                        interaction_order=interaction_order
                    )
                    db.session.add(interaction)
                    
                    # Update session timestamp
                    active_session.updated_at = datetime.utcnow()
                    db.session.commit()
            except Exception as e:
                logging.warning(f"Failed to save interaction to session: {str(e)}")
                db.session.rollback()
        
        # Log the interaction
        logging.info(f"Generated answer for question: {question[:50]}...")
        
        return jsonify({
            'success': True,
            'question': question,
            'answer': answer,
            'timestamp': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'session_id': session_id
        })
        
    except Exception as e:
        logging.error(f"Error in send_question: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to generate answer: {str(e)}'
        }), 500

@app.route('/sessions', methods=['GET'])
def get_sessions():
    """Get all interview sessions"""
    try:
        sessions = InterviewSession.query.order_by(InterviewSession.updated_at.desc()).all()
        return jsonify({
            'success': True,
            'sessions': [session.to_dict() for session in sessions]
        })
    except Exception as e:
        logging.error(f"Error getting sessions: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get sessions: {str(e)}'
        }), 500

@app.route('/sessions', methods=['POST'])
def create_session():
    """Create a new interview session"""
    try:
        data = request.get_json()
        title = data.get('title', f'Session {datetime.now().strftime("%Y-%m-%d %H:%M")}')
        
        # End current active session if exists
        session_id = session.get('active_session_id')
        if session_id:
            current_session = InterviewSession.query.get(session_id)
            if current_session:
                current_session.is_active = False
        
        # Create new session
        new_session = InterviewSession(title=title, is_active=True)
        db.session.add(new_session)
        db.session.commit()
        
        # Set as active session
        session['active_session_id'] = new_session.id
        
        return jsonify({
            'success': True,
            'session': new_session.to_dict()
        })
        
    except Exception as e:
        logging.error(f"Error creating session: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to create session: {str(e)}'
        }), 500

@app.route('/sessions/<int:session_id>', methods=['GET'])
def get_session(session_id):
    """Get a specific session with all interactions"""
    try:
        session_obj = InterviewSession.query.get_or_404(session_id)
        interactions = SessionInteraction.query.filter_by(session_id=session_id)\
            .order_by(SessionInteraction.interaction_order).all()
        
        return jsonify({
            'success': True,
            'session': session_obj.to_dict(),
            'interactions': [interaction.to_dict() for interaction in interactions]
        })
        
    except Exception as e:
        logging.error(f"Error getting session {session_id}: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get session: {str(e)}'
        }), 500

@app.route('/sessions/<int:session_id>/activate', methods=['POST'])
def activate_session(session_id):
    """Activate a session for recording new interactions"""
    try:
        # Deactivate current session
        current_session_id = session.get('active_session_id')
        if current_session_id:
            current_session = InterviewSession.query.get(current_session_id)
            if current_session:
                current_session.is_active = False
        
        # Activate new session
        target_session = InterviewSession.query.get_or_404(session_id)
        target_session.is_active = True
        target_session.updated_at = datetime.utcnow()
        
        db.session.commit()
        session['active_session_id'] = session_id
        
        return jsonify({
            'success': True,
            'session': target_session.to_dict()
        })
        
    except Exception as e:
        logging.error(f"Error activating session {session_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to activate session: {str(e)}'
        }), 500

@app.route('/sessions/<int:session_id>', methods=['DELETE'])
def delete_session(session_id):
    """Delete a session and all its interactions"""
    try:
        session_obj = InterviewSession.query.get_or_404(session_id)
        
        # Clear active session if this is the one being deleted
        if session.get('active_session_id') == session_id:
            session.pop('active_session_id', None)
        
        db.session.delete(session_obj)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Session deleted successfully'
        })
        
    except Exception as e:
        logging.error(f"Error deleting session {session_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to delete session: {str(e)}'
        }), 500

@app.route('/sessions/<int:session_id>/rename', methods=['PUT'])
def rename_session(session_id):
    """Rename a session"""
    try:
        data = request.get_json()
        new_title = data.get('title', '').strip()
        
        if not new_title:
            return jsonify({
                'success': False,
                'message': 'Title cannot be empty'
            }), 400
        
        session_obj = InterviewSession.query.get_or_404(session_id)
        session_obj.title = new_title
        session_obj.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'session': session_obj.to_dict()
        })
        
    except Exception as e:
        logging.error(f"Error renaming session {session_id}: {str(e)}")
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': f'Failed to rename session: {str(e)}'
        }), 500

@app.route('/current_session', methods=['GET'])
def get_current_session():
    """Get the currently active session"""
    try:
        session_id = session.get('active_session_id')
        if not session_id:
            return jsonify({
                'success': True,
                'session': None
            })
        
        session_obj = InterviewSession.query.get(session_id)
        if not session_obj or not session_obj.is_active:
            session.pop('active_session_id', None)
            return jsonify({
                'success': True,
                'session': None
            })
        
        return jsonify({
            'success': True,
            'session': session_obj.to_dict()
        })
        
    except Exception as e:
        logging.error(f"Error getting current session: {str(e)}")
        return jsonify({
            'success': False,
            'message': f'Failed to get current session: {str(e)}'
        }), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)