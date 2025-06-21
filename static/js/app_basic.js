class InterviewAssistant {
    constructor() {
        this.answerCount = 0;
        this.recognition = null;
        this.isListening = false;
        this.transcript = '';
        this.speechEnabled = true; // TTS toggle
        this.currentSession = null;
        this.sessions = [];
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.bindEvents();
        this.loadCurrentSession();
        this.loadSessions();
    }
    
    initializeElements() {
        // Control buttons
        this.sendQuestionBtn = document.getElementById('send-question-btn');
        this.clearAnswersBtn = document.getElementById('clear-answers-btn');
        this.clearQuestionBtn = document.getElementById('clear-question-btn');
        
        // Speech recognition elements
        this.startDictationBtn = document.getElementById('start-dictation-btn');
        this.stopAndAskBtn = document.getElementById('stop-and-ask-btn');
        this.dictationStatus = document.getElementById('dictation-status');
        this.liveTranscript = document.getElementById('live-transcript');
        
        // Display areas
        this.answersArea = document.getElementById('answers-area');
        
        // Input elements
        this.manualQuestionInput = document.getElementById('manual-question');
        
        // Session elements
        this.sessionMenuBtn = document.getElementById('session-menu-btn');
        this.sessionControls = document.getElementById('session-controls');
        this.newSessionBtn = document.getElementById('new-session-btn');
        this.saveSessionBtn = document.getElementById('save-session-btn');
        this.loadSessionBtn = document.getElementById('load-session-btn');
        this.currentSessionInfo = document.getElementById('current-session-info');
        this.currentSessionName = document.getElementById('current-session-name');
        this.sessionModal = document.getElementById('sessionModal');
        this.sessionsList = document.getElementById('sessions-list');
        this.modalNewSessionBtn = document.getElementById('modal-new-session-btn');
        
        // Sample question buttons
        this.sampleQuestionBtns = document.querySelectorAll('.sample-question');
        
        // Speech toggle button
        this.speechToggleBtn = document.getElementById('speech-toggle');
    }
    
    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.recognition = new SpeechRecognition();
            this.lastFinalTranscript = '';
            
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = true;
            this.recognition.continuous = true;
            this.recognition.maxAlternatives = 1;
            
            this.recognition.onstart = () => {
                this.isListening = true;
                this.dictationStatus.innerHTML = '<span class="text-success">🎤 Listening... Speak clearly</span>';
                this.liveTranscript.style.display = 'block';
                this.liveTranscript.innerHTML = '<em class="text-muted">Listening for your speech...</em>';
                this.startDictationBtn.disabled = true;
                this.stopAndAskBtn.disabled = false;
            };
            
            this.recognition.onresult = (event) => {
                let interimTranscript = '';
                let finalTranscript = '';
                
                for (let i = event.resultIndex; i < event.results.length; i++) {
                    const transcript = event.results[i][0].transcript;
                    if (event.results[i].isFinal) {
                        finalTranscript += transcript;
                    } else {
                        interimTranscript += transcript;
                    }
                }
                
                // Only add new final transcript if it's different from the last one
                if (finalTranscript && finalTranscript !== this.lastFinalTranscript) {
                    this.transcript += finalTranscript + ' ';
                    this.lastFinalTranscript = finalTranscript;
                }
                
                const displayText = this.transcript + '<span style="color: #999;">' + interimTranscript + '</span>';
                this.liveTranscript.innerHTML = displayText || '<em class="text-muted">Listening for your speech...</em>';
                
                const fullText = (this.transcript + interimTranscript).trim();
                if (fullText) {
                    this.manualQuestionInput.value = fullText;
                }
            };
            
            this.recognition.onerror = (event) => {
                this.handleSpeechError(event.error);
            };
            
            this.recognition.onend = () => {
                this.isListening = false;
                this.startDictationBtn.disabled = false;
                this.stopAndAskBtn.disabled = true;
                
                if (this.transcript.trim()) {
                    this.dictationStatus.innerHTML = '<span class="text-success">✓ Speech captured successfully</span>';
                    this.liveTranscript.innerHTML = `<strong>Final transcript:</strong> ${this.transcript}`;
                    
                    // If we're in auto-ask mode, send the question automatically
                    if (this.autoAskAfterStop) {
                        this.autoAskAfterStop = false;
                        setTimeout(() => this.sendManualQuestion(), 500);
                    }
                } else {
                    this.dictationStatus.innerHTML = '<span class="text-muted">Click "Ask AI" to speak your question</span>';
                    this.liveTranscript.style.display = 'none';
                }
            };
        } else {
            this.dictationStatus.innerHTML = '<span class="text-warning">⚠️ Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.</span>';
            this.startDictationBtn.disabled = true;
        }
    }
    
    readAnswerAloud(text) {
        if ('speechSynthesis' in window && this.speechEnabled) {
            // Stop any ongoing speech
            speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1.0;
            utterance.volume = 0.8;
            
            // Optional: Choose a specific voice
            const voices = speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.lang.startsWith('en') && voice.name.includes('Google')
            ) || voices.find(voice => voice.lang.startsWith('en'));
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            speechSynthesis.speak(utterance);
        }
    }
    
    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        const speechToggle = document.getElementById('speech-toggle');
        if (speechToggle) {
            speechToggle.innerHTML = this.speechEnabled 
                ? '<i data-feather="volume-2" class="me-1"></i>Speech ON'
                : '<i data-feather="volume-x" class="me-1"></i>Speech OFF';
            speechToggle.className = this.speechEnabled 
                ? 'btn btn-sm btn-success'
                : 'btn btn-sm btn-outline-secondary';
            feather.replace();
        }
    }
    
    bindEvents() {
        this.sendQuestionBtn.addEventListener('click', () => this.sendManualQuestion());
        this.clearAnswersBtn.addEventListener('click', () => this.clearAnswers());
        this.clearQuestionBtn.addEventListener('click', () => this.clearQuestion());
        
        // Speech recognition events
        this.startDictationBtn.addEventListener('click', () => this.startDictation());
        this.stopAndAskBtn.addEventListener('click', () => this.stopDictationAndAsk());
        
        // Speech toggle event
        if (this.speechToggleBtn) {
            this.speechToggleBtn.addEventListener('click', () => this.toggleSpeech());
        }
        
        // Session events
        this.sessionMenuBtn.addEventListener('click', () => this.toggleSessionControls());
        this.newSessionBtn.addEventListener('click', () => this.createNewSession());
        this.loadSessionBtn.addEventListener('click', () => this.showSessionModal());
        this.modalNewSessionBtn.addEventListener('click', () => this.createNewSessionFromModal());
        
        // Enter key in manual question input
        this.manualQuestionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                this.sendManualQuestion();
            }
        });
        
        // Auto-resize textarea
        this.manualQuestionInput.addEventListener('input', this.autoResizeTextarea);
        
        // Sample question buttons
        this.sampleQuestionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const question = e.target.getAttribute('data-question');
                this.manualQuestionInput.value = question;
                this.autoResizeTextarea({ target: this.manualQuestionInput });
            });
        });
    }
    
    async sendManualQuestion() {
        const question = this.manualQuestionInput.value.trim();
        
        if (!question) {
            this.showError('Please enter a question');
            return;
        }
        
        try {
            this.setButtonLoading(this.sendQuestionBtn, true);
            
            const response = await fetch('/send_question', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ question: question })
            });
            
            const data = await response.json();
            
            if (data.success) {
                this.displayAnswer(data.question, data.answer, data.timestamp);
                // Read answer aloud if speech is enabled
                if (this.speechEnabled) {
                    this.readAnswerAloud(data.answer);
                }
            } else {
                this.showError(data.message);
            }
            
        } catch (error) {
            this.showError(`Failed to send question: ${error.message}`);
        } finally {
            this.setButtonLoading(this.sendQuestionBtn, false);
        }
    }
    
    startDictation() {
        if (this.recognition && !this.isListening) {
            this.transcript = '';
            this.lastFinalTranscript = '';
            this.recognition.start();
        }
    }
    
    stopDictation() {
        if (this.recognition && this.isListening) {
            this.recognition.stop();
        }
    }
    
    stopDictationAndAsk() {
        if (this.recognition && this.isListening) {
            this.autoAskAfterStop = true;
            this.recognition.stop();
            this.dictationStatus.innerHTML = '<span class="text-info">⏳ Stopping dictation and getting AI answer...</span>';
        }
    }
    
    handleSpeechError(error) {
        this.isListening = false;
        this.startDictationBtn.disabled = false;
        this.stopAndAskBtn.disabled = true;
        
        let errorMessage = '';
        
        switch (error) {
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
                break;
            case 'no-speech':
                errorMessage = 'No speech detected. Please try speaking louder or closer to the microphone.';
                break;
            case 'audio-capture':
                errorMessage = 'Audio capture failed. Please check your microphone connection.';
                break;
            case 'network':
                errorMessage = 'Network error occurred during speech recognition.';
                break;
            case 'service-not-allowed':
                errorMessage = 'Speech recognition service not allowed. Please check browser settings.';
                break;
            default:
                errorMessage = `Speech recognition error: ${error}`;
        }
        
        this.dictationStatus.innerHTML = `<span class="text-danger">⚠️ ${errorMessage}</span>`;
        this.liveTranscript.style.display = 'none';
        
        console.error('Speech recognition error:', error);
    }
    
    clearAnswers() {
        this.answersArea.innerHTML = `
            <p class="text-muted text-center py-4">
                <i data-feather="message-circle" class="me-2"></i>
                AI-generated answers will appear here after you submit a question...
            </p>
        `;
        this.answerCount = 0;
        feather.replace();
    }
    
    clearQuestion() {
        this.manualQuestionInput.value = '';
        this.autoResizeTextarea({ target: this.manualQuestionInput });
    }
    
    displayAnswer(question, answer, timestamp) {
        this.answerCount++;
        
        // Remove empty state message
        if (this.answerCount === 1) {
            this.answersArea.innerHTML = '';
        }
        
        const answerElement = this.createAnswerElement(question, answer, timestamp, this.answerCount);
        this.answersArea.insertBefore(answerElement, this.answersArea.firstChild);
        
        // Auto-scroll to top to show new answer
        this.answersArea.scrollTop = 0;
    }
    
    createAnswerElement(question, answer, timestamp, id) {
        const div = document.createElement('div');
        div.className = 'answer-item';
        div.innerHTML = `
            <div class="answer-timestamp">
                <i data-feather="clock" style="width: 12px; height: 12px;"></i>
                ${new Date(timestamp * 1000).toLocaleTimeString()}
            </div>
            <div class="answer-question">
                <i data-feather="help-circle" style="width: 16px; height: 16px;"></i>
                ${this.escapeHtml(question)}
            </div>
            <div class="answer-text" style="color: #181818; font-weight: 500;">${this.escapeHtml(answer)}</div>
            <div class="answer-actions">
                <button class="btn btn-sm btn-outline-primary copy-btn" data-text="${this.escapeHtml(answer)}">
                    <i data-feather="copy" style="width: 14px; height: 14px;"></i>
                    Copy Answer
                </button>
                <button class="btn btn-sm btn-outline-secondary copy-question-btn" data-text="${this.escapeHtml(question)}">
                    <i data-feather="message-square" style="width: 14px; height: 14px;"></i>
                    Copy Question
                </button>
                <button class="btn btn-sm btn-outline-info replay-btn" data-text="${this.escapeHtml(answer)}">
                    <i data-feather="volume-2" style="width: 14px; height: 14px;"></i>
                    Read Aloud
                </button>
            </div>
        `;
        
        // Bind copy and replay events
        const copyBtn = div.querySelector('.copy-btn');
        const copyQuestionBtn = div.querySelector('.copy-question-btn');
        const replayBtn = div.querySelector('.replay-btn');
        
        copyBtn.addEventListener('click', (e) => this.copyToClipboard(e, answer));
        copyQuestionBtn.addEventListener('click', (e) => this.copyToClipboard(e, question));
        replayBtn.addEventListener('click', () => this.readAnswerAloud(answer));
        
        // Replace feather icons
        setTimeout(() => feather.replace(), 0);
        
        return div;
    }
    
    async copyToClipboard(event, text) {
        try {
            await navigator.clipboard.writeText(text);
            
            const button = event.currentTarget;
            const originalHTML = button.innerHTML;
            const originalClass = button.className;
            
            button.innerHTML = '<i data-feather="check" style="width: 14px; height: 14px;"></i> Copied!';
            button.className = button.className.replace('btn-outline-primary', 'btn-success').replace('btn-outline-secondary', 'btn-success');
            
            feather.replace();
            
            setTimeout(() => {
                button.innerHTML = originalHTML;
                button.className = originalClass;
                feather.replace();
            }, 2000);
            
        } catch (error) {
            this.showError('Failed to copy to clipboard');
        }
    }
    
    showError(message) {
        // Create a toast-like error notification
        const toast = document.createElement('div');
        toast.className = 'toast align-items-center text-bg-danger border-0 position-fixed top-0 end-0 m-3';
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i data-feather="alert-circle" style="width: 16px; height: 16px;"></i>
                    ${this.escapeHtml(message)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        document.body.appendChild(toast);
        feather.replace();
        
        const bsToast = new bootstrap.Toast(toast, { autohide: true, delay: 5000 });
        bsToast.show();
        
        toast.addEventListener('hidden.bs.toast', () => {
            document.body.removeChild(toast);
        });
        
        console.error('Interview Assistant Error:', message);
    }
    
    setButtonLoading(button, loading) {
        if (loading) {
            button.classList.add('btn-loading');
            button.disabled = true;
        } else {
            button.classList.remove('btn-loading');
            button.disabled = false;
        }
    }
    
    autoResizeTextarea(event) {
        const textarea = event.target;
        textarea.style.height = 'auto';
        textarea.style.height = (textarea.scrollHeight) + 'px';
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.interviewAssistant = new InterviewAssistant();
});