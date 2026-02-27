// MedNote AI - Recorder Module (recorder.js)

// Encapsulate in IIFE to avoid global scope pollution
let timerInterval;
let seconds = 0;

function initRecorder(app) {
    const el = {
        btnStart: document.getElementById('btn-start-record'),
        btnStop: document.getElementById('btn-stop-record'),
        stateIdle: document.getElementById('state-idle'),
        stateRecording: document.getElementById('state-recording'),
        stateProcessing: document.getElementById('state-processing'),
        timerDisplay: document.getElementById('timer-display'),
        glow: document.getElementById('recording-glow'),
        progressBar: document.getElementById('progress-bar'),
        statusText: document.getElementById('processing-status-text')
    };

    if (!el.btnStart) return;

    // Formatting timer string (MM:SS)
    const formatTime = (totalSeconds) => {
        const m = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    // State 1: IDLE -> RECORDING
    el.btnStart.addEventListener('click', () => {
        // UI Reset & Transitions
        el.stateIdle.classList.add('hidden');
        el.stateRecording.classList.remove('hidden');
        el.stateRecording.classList.add('fade-in');

        // Glow effect
        el.glow.classList.remove('bg-emerald-500/0');
        el.glow.classList.add('bg-red-500/20');

        // Start Timer
        seconds = 0;
        el.timerDisplay.textContent = formatTime(seconds);
        timerInterval = setInterval(() => {
            seconds++;
            el.timerDisplay.textContent = formatTime(seconds);
        }, 1000);
    });

    // State 2: RECORDING -> PROCESSING
    el.btnStop.addEventListener('click', () => {
        clearInterval(timerInterval);

        // UI Transitions
        el.stateRecording.classList.add('hidden');
        el.stateProcessing.classList.remove('hidden');
        el.stateProcessing.classList.add('fade-in');

        // Glow effect changes to emerald processing
        el.glow.classList.remove('bg-red-500/20');
        el.glow.classList.add('bg-emerald-500/20');

        // Simulate Processing Pipeline (Transcription -> IA Analysis)
        simulateProcessingPipeline(app);
    });

    function simulateProcessingPipeline(app) {
        // Phase 1: Transcription
        setTimeout(() => {
            el.progressBar.style.width = '40%';
            el.statusText.textContent = 'Transcrevendo (Whisper AI)...';
        }, 500);

        // Phase 2: AI Analysis (Doctor Template)
        setTimeout(() => {
            el.progressBar.style.width = '70%';
            el.statusText.textContent = 'Gerando Prontuário Médico (Claude 3.5 Sonnet)...';
        }, 3000);

        // Phase 3: AI Analysis (Patient Template)
        setTimeout(() => {
            el.progressBar.style.width = '90%';
            el.statusText.textContent = 'Gerando Resumo Paciente (Claude 3.5 Sonnet)...';
        }, 5500);

        // Phase 4: Finalization & Transition to Results
        setTimeout(() => {
            el.progressBar.style.width = '100%';
            el.statusText.textContent = 'Finalizado!';

            // Allow user to see 100% before navigating
            setTimeout(() => {
                resetRecorder();
                if (typeof generateMockResults === 'function') generateMockResults();
                app.navigateTo('results');
            }, 800);

        }, 7500);
    }

    // Helper to snap back to start state
    function resetRecorder() {
        el.stateProcessing.classList.add('hidden');
        el.stateIdle.classList.remove('hidden');
        el.progressBar.style.width = '0%';
        el.glow.classList.remove('bg-emerald-500/20');
        el.glow.classList.add('bg-emerald-500/0');
    }
}
