# replit.md

## Overview

This is an Interview Assistant web application that helps users practice interview skills by providing AI-powered answers to interview questions. The app includes multiple interface versions: a basic manual input version, a simplified WebSocket version, and an advanced audio recording version.

## System Architecture

The application follows a Flask-based web architecture with multiple frontend variants:

1. **Backend**: Python Flask server handling HTTP requests and WebSocket connections
2. **Frontend**: HTML/CSS/JavaScript with Bootstrap styling and WebSocket support
3. **AI Integration**: OpenAI GPT-4o for generating interview answers
4. **Audio Processing**: Optional Whisper integration for speech-to-text transcription

The application uses a modular approach with three main entry points:
- `app_basic.py`: Simple HTTP-only version with manual question input
- `app_simple.py`: WebSocket-enabled version for real-time updates
- `app.py`: Full-featured version with audio recording capabilities (when available)

## Key Components

### Backend Components

1. **Main Application (`main.py`)**
   - Entry point that loads the basic app version
   - Production-ready with Gunicorn deployment configuration

2. **OpenAI Client (`openai_client.py`)**
   - Handles all OpenAI API interactions
   - Uses GPT-4o model for answer generation
   - Includes interview-specific system prompts

3. **Audio Processor (`audio_processor.py`)**
   - Optional component for speech-to-text using Whisper
   - Handles microphone input and audio recording
   - Graceful fallback when audio libraries aren't available

4. **Configuration (`config.py`)**
   - Centralized application settings
   - Environment variable management
   - Model and API configuration

### Frontend Components

1. **Templates**
   - `index_basic.html`: Simple form-based interface
   - `index_simple.html`: WebSocket-enabled interface
   - `index.html`: Full-featured interface with audio controls

2. **JavaScript Applications**
   - `app_basic.js`: Basic form handling and speech recognition
   - `app_simple.js`: WebSocket communication
   - `app.js`: Full-featured audio processing

3. **Styling (`style.css`)**
   - Modern gradient background with floating animations
   - Dark theme with high contrast text
   - Responsive design with Bootstrap integration

## Data Flow

1. **Question Input**: Users can input questions via:
   - Manual text input
   - Browser-based speech recognition (Web Speech API)
   - Optional server-side audio recording (when available)

2. **AI Processing**: Questions are sent to OpenAI GPT-4o via the backend
3. **Response Delivery**: Answers are delivered via:
   - HTTP responses (basic version)
   - WebSocket messages (simple/full versions)
   - Real-time updates in the UI

4. **Display**: Answers are formatted and displayed with copy functionality

## External Dependencies

### Core Dependencies
- **Flask**: Web framework and HTTP server
- **Flask-SocketIO**: WebSocket support for real-time communication
- **OpenAI**: AI answer generation using GPT-4o
- **Gunicorn**: Production WSGI server

### Optional Audio Dependencies
- **Whisper**: Speech-to-text transcription
- **SoundDevice**: Audio input capture
- **NumPy**: Audio data processing

### Frontend Dependencies
- **Bootstrap**: UI framework with dark theme
- **Socket.IO**: WebSocket client
- **Feather Icons**: Icon library
- **Web Speech API**: Browser-based speech recognition

## Deployment Strategy

The application is configured for Replit autoscale deployment with:

1. **Development**: Flask development server on port 5000
2. **Production**: Gunicorn WSGI server with auto-reload
3. **Environment**: Python 3.11 with Nix package management
4. **Database**: PostgreSQL available but not currently used
5. **Audio Support**: PortAudio and OpenSSL included for potential audio features

The deployment supports graceful degradation - audio features are optional and the app falls back to manual input when audio libraries aren't available.

## Changelog

- June 21, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.