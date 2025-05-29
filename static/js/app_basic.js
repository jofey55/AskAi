class InterviewAssistant {
    constructor() {
        this.answerCount = 0;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.initializeElements();
        this.bindEvents();
    }
    
    initializeElements() {
        // Control buttons
        this.sendQuestionBtn = document.getElementById('send-question-btn');
        this.clearAnswersBtn = document.getElementById('clear-answers-btn');
        this.clearQuestionBtn = document.getElementById('clear-question-btn');
        
        // Audio recording elements
        this.startRecordingBtn = document.getElementById('start-recording-btn');
        this.stopRecordingBtn = document.getElementById('stop-recording-btn');
        this.recordingStatus = document.getElementById('recording-status');
        this.audioPlayback = document.getElementById('audio-playback');
        
        // Display areas
        this.answersArea = document.getElementById('answers-area');
        
        // Input elements
        this.manualQuestionInput = document.getElementById('manual-question');
        
        // Sample question buttons
        this.sampleQuestionBtns = document.querySelectorAll('.sample-question');
    }
    
    bindEvents() {
        this.sendQuestionBtn.addEventListener('click', () => this.sendManualQuestion());
        this.clearAnswersBtn.addEventListener('click', () => this.clearAnswers());
        this.clearQuestionBtn.addEventListener('click', () => this.clearQuestion());
        
        // Audio recording events
        this.startRecordingBtn.addEventListener('click', () => this.startRecording());
        this.stopRecordingBtn.addEventListener('click', () => this.stopRecording());
        
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
            } else {
                this.showError(data.message);
            }
            
        } catch (error) {
            this.showError(`Failed to send question: ${error.message}`);
        } finally {
            this.setButtonLoading(this.sendQuestionBtn, false);
        }
    }
    
    async startRecording() {
        try {
            this.setButtonLoading(this.startRecordingBtn, true);
            
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.onstart = () => {
                this.recordingStatus.textContent = "🎤 Recording... Speak your interview question clearly";
                this.recordingStatus.className = "text-danger mb-3";
                this.startRecordingBtn.disabled = true;
                this.stopRecordingBtn.disabled = false;
                this.setButtonLoading(this.startRecordingBtn, false);
            };
            
            this.mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    this.audioChunks.push(event.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                this.audioPlayback.src = audioUrl;
                this.audioPlayback.style.display = 'block';
                
                this.recordingStatus.textContent = "Recording stopped. You can play your recording above or type the question manually below.";
                this.recordingStatus.className = "text-muted mb-3";
                this.startRecordingBtn.disabled = false;
                this.stopRecordingBtn.disabled = true;
                
                // Stop all audio tracks
                stream.getTracks().forEach(track => track.stop());
            };
            
            this.mediaRecorder.start();
            
        } catch (error) {
            this.setButtonLoading(this.startRecordingBtn, false);
            
            if (error.name === 'NotAllowedError') {
                this.recordingStatus.textContent = "Microphone access denied. Please allow microphone access and try again.";
                this.recordingStatus.className = "text-danger mb-3";
            } else if (error.name === 'NotFoundError') {
                this.recordingStatus.textContent = "No microphone found. Please check your microphone connection.";
                this.recordingStatus.className = "text-danger mb-3";
            } else {
                this.recordingStatus.textContent = `Recording error: ${error.message}`;
                this.recordingStatus.className = "text-danger mb-3";
            }
            
            console.error('Error accessing microphone:', error);
        }
    }
    
    stopRecording() {
        if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
            this.mediaRecorder.stop();
        }
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
            <div class="answer-text">${this.escapeHtml(answer)}</div>
            <div class="answer-actions">
                <button class="btn btn-sm btn-outline-primary copy-btn" data-text="${this.escapeHtml(answer)}">
                    <i data-feather="copy" style="width: 14px; height: 14px;"></i>
                    Copy Answer
                </button>
                <button class="btn btn-sm btn-outline-secondary copy-question-btn" data-text="${this.escapeHtml(question)}">
                    <i data-feather="message-square" style="width: 14px; height: 14px;"></i>
                    Copy Question
                </button>
            </div>
        `;
        
        // Bind copy events
        const copyBtn = div.querySelector('.copy-btn');
        const copyQuestionBtn = div.querySelector('.copy-question-btn');
        
        copyBtn.addEventListener('click', (e) => this.copyToClipboard(e, answer));
        copyQuestionBtn.addEventListener('click', (e) => this.copyToClipboard(e, question));
        
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