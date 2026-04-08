// MedNote AI - Recorder Module (recorder.js)

const TRANSCRIPT_STORAGE_KEY = 'mednote_last_transcription';

let timerInterval = null;
let seconds       = 0;

// Audio pipeline
let mediaStream   = null;
let mediaRecorder = null;
let audioChunks   = [];

// Online mode (mic + speaker mix)
let displayStream = null;
let mixAudioCtx   = null;
let isOnlineMode  = false;

// SpeechRecognition
let recognition           = null;
let accumulatedTranscript = ''; // texto final de todas as sessões anteriores

// Web Audio visualizer
let audioCtx     = null;
let analyser     = null;
let vizAnimFrame = null;

// Pause state
let isPaused         = false;
let currentSessionId = null;

// ─── SpeechRecognition ────────────────────────────────────────────────────────
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const hasSpeechAPI      = !!SpeechRecognition;

/**
 * Cria uma instância de SpeechRecognition.
 * Cada instância mantém seu próprio sessionFinal isolado.
 * O texto acumulado de sessões anteriores fica em accumulatedTranscript (escopo de módulo).
 */
function buildRecognition(onResult, onError, onChunk) {
    if (!hasSpeechAPI) return null;

    const rec = new SpeechRecognition();
    rec.continuous      = true;
    rec.interimResults  = true;
    rec.lang            = 'pt-BR';
    rec.maxAlternatives = 1;

    let sessionFinal = ''; // texto finalizado NESTA sessão de recognition

    rec.onresult = (event) => {
        let interim = '';
        // Processa apenas resultados novos (a partir de resultIndex)
        for (let i = event.resultIndex; i < event.results.length; i++) {
            const text = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                sessionFinal += text + ' ';
            } else {
                interim += text;
            }
        }
        // Exibe acumulado de sessões anteriores + sessão atual + interim
        onResult(accumulatedTranscript + sessionFinal, interim);
    };

    rec.onerror = (event) => {
        if (event.error !== 'no-speech') onError(event.error);
    };

    // onend: chamado quando a sessão encerra (auto ou manual)
    rec.onend = () => {
        // Persiste o chunk antes de reiniciar (proteção contra refresh)
        if (onChunk && sessionFinal.trim()) onChunk(sessionFinal);
        accumulatedTranscript += sessionFinal;
        sessionFinal = '';

        // Reinicia automaticamente apenas se ainda estiver gravando
        if (mediaStream && mediaStream.active && !isPaused) {
            setTimeout(() => { try { rec.start(); } catch (_) {} }, 150);
        }
    };

    // Método para forçar flush antes de um stop manual (pause ou stop)
    rec._flush = () => {
        if (onChunk && sessionFinal.trim()) onChunk(sessionFinal);
        accumulatedTranscript += sessionFinal;
        sessionFinal = '';
    };

    return rec;
}

// ─── Audio visualizer ─────────────────────────────────────────────────────────
function startVisualizer(stream, bars) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 64;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    function draw() {
        vizAnimFrame = requestAnimationFrame(draw);
        analyser.getByteFrequencyData(dataArray);
        bars.forEach((bar, i) => {
            const bucket = Math.floor((i / bars.length) * (analyser.frequencyBinCount * 0.6));
            const value  = dataArray[bucket] / 255;
            bar.style.height = `${8 + value * 32}px`;
        });
    }
    draw();
}

function stopVisualizer() {
    if (vizAnimFrame) cancelAnimationFrame(vizAnimFrame);
    if (audioCtx) { audioCtx.close(); audioCtx = null; }
    analyser = null;
}

// ─── Main module ──────────────────────────────────────────────────────────────
function initRecorder(app) {
    const el = {
        btnStart:            document.getElementById('btn-start-record'),
        btnStop:             document.getElementById('btn-stop-record'),
        stateIdle:           document.getElementById('state-idle'),
        stateRecording:      document.getElementById('state-recording'),
        stateProcessing:     document.getElementById('state-processing'),
        timerDisplay:        document.getElementById('timer-display'),
        glow:                document.getElementById('recording-glow'),
        progressBar:         document.getElementById('progress-bar'),
        statusText:          document.getElementById('processing-status-text'),
        vizBars:             Array.from(document.querySelectorAll('.viz-bar')),
        liveTranscriptText:  document.getElementById('live-transcript-text'),
        liveTranscriptBox:   document.getElementById('live-transcript-box'),
        storedTranscript:    document.getElementById('stored-transcript'),
        transcriptionStatus: document.getElementById('transcription-status'),
        transcriptWordCount: document.getElementById('transcript-word-count'),
        btnCopyTranscript:   document.getElementById('btn-copy-transcript'),
        btnClearTranscript:  document.getElementById('btn-clear-transcript'),
        btnGenerateSummary:  document.getElementById('btn-generate-summary'),
        btnPause:            document.getElementById('btn-pause-record'),
        pauseIcon:           document.getElementById('pause-icon'),
        pauseLabel:          document.getElementById('pause-label'),
        recordingLabel:      document.getElementById('recording-label'),
        micErrorBanner:      document.getElementById('mic-error-banner'),
        micErrorText:        document.getElementById('mic-error-text'),
        speechUnsupported:   document.getElementById('speech-unsupported-banner'),
    };

    if (!el.btnStart) return;

    if (!hasSpeechAPI && el.speechUnsupported) {
        el.speechUnsupported.classList.remove('hidden');
        el.speechUnsupported.classList.add('flex');
    }

    // ── Online mode toggle ────────────────────────────────────────────────────
    const elOnlineToggle   = document.getElementById('online-mode-toggle');
    const elOnlineSwitch   = document.getElementById('online-mode-switch');
    const elOnlineKnob     = document.getElementById('online-mode-knob');
    const elOnlineIconWrap = document.getElementById('online-mode-icon-wrap');
    const elOnlineIcon     = document.getElementById('online-mode-icon');
    const elOnlineNote     = document.getElementById('online-mode-note');

    if (elOnlineToggle) {
        elOnlineToggle.addEventListener('click', () => {
            isOnlineMode = !isOnlineMode;
            if (isOnlineMode) {
                elOnlineSwitch?.classList.replace('bg-zinc-300', 'bg-violet-500');
                if (elOnlineKnob) elOnlineKnob.style.transform = 'translateX(16px)';
                elOnlineToggle.classList.replace('bg-zinc-50', 'bg-violet-50');
                elOnlineToggle.classList.replace('border-zinc-200', 'border-violet-300');
                if (elOnlineIconWrap) { elOnlineIconWrap.classList.replace('bg-zinc-100', 'bg-violet-100'); }
                if (elOnlineIcon)     { elOnlineIcon.classList.replace('text-zinc-500', 'text-violet-500'); }
            } else {
                elOnlineSwitch?.classList.replace('bg-violet-500', 'bg-zinc-300');
                if (elOnlineKnob) elOnlineKnob.style.transform = 'translateX(0px)';
                elOnlineToggle.classList.replace('bg-violet-50', 'bg-zinc-50');
                elOnlineToggle.classList.replace('border-violet-300', 'border-zinc-200');
                if (elOnlineIconWrap) { elOnlineIconWrap.classList.replace('bg-violet-100', 'bg-zinc-100'); }
                if (elOnlineIcon)     { elOnlineIcon.classList.replace('text-violet-500', 'text-zinc-500'); }
            }
        });
    }

    function stopDisplayStream() {
        displayStream?.getTracks().forEach(t => t.stop());
        displayStream = null;
        mixAudioCtx?.close();
        mixAudioCtx = null;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    const formatTime = (s) =>
        `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

    function updateWordCount(text) {
        if (!el.transcriptWordCount) return;
        const count = text.trim() ? text.trim().split(/\s+/).length : 0;
        el.transcriptWordCount.textContent = count.toLocaleString('pt-BR');
    }

    function setStatus(text, color = 'zinc') {
        if (!el.transcriptionStatus) return;
        const map = { zinc: 'text-zinc-400', red: 'text-red-500', emerald: 'text-emerald-500', violet: 'text-violet-500', amber: 'text-amber-500' };
        el.transcriptionStatus.textContent = text;
        el.transcriptionStatus.className   = `text-[11px] mt-0.5 ${map[color] || map.zinc}`;
    }

    function enableGenerateButton(on) {
        if (el.btnGenerateSummary) el.btnGenerateSummary.disabled = !on;
    }

    function showMicError(msg) {
        if (!el.micErrorBanner || !el.micErrorText) return;
        el.micErrorText.textContent = msg;
        el.micErrorBanner.classList.remove('hidden');
        el.micErrorBanner.classList.add('flex');
    }

    function hideMicError() {
        el.micErrorBanner?.classList.add('hidden');
        el.micErrorBanner?.classList.remove('flex');
    }

    // Atualiza a caixa de transcrição ao vivo sem reconstruir o texto já exibido.
    // Mantém o texto finalizado estável e só atualiza o span de interim (palavras em andamento).
    // Isso evita o efeito "rolando do início ao fim" que ocorria ao reiniciar a sessão de recognition.
    let _liveBoxLastFinal = '';
    function updateLiveBox(final, interim) {
        if (!el.liveTranscriptText) return;

        // Só reconstrói o texto final quando ele realmente mudou
        if (final !== _liveBoxLastFinal) {
            _liveBoxLastFinal = final;
            el.liveTranscriptText.textContent = '';
            const spanFinal = document.createElement('span');
            spanFinal.textContent = final;
            el.liveTranscriptText.appendChild(spanFinal);

            // Recria o span de interim após atualizar o final
            const spanInterim = document.createElement('span');
            spanInterim.id = 'live-interim-span';
            spanInterim.className = 'text-zinc-400 italic';
            spanInterim.textContent = interim;
            el.liveTranscriptText.appendChild(spanInterim);
        } else {
            // Apenas atualiza o interim sem tocar no texto final já renderizado
            let spanInterim = document.getElementById('live-interim-span');
            if (!spanInterim) {
                spanInterim = document.createElement('span');
                spanInterim.id = 'live-interim-span';
                spanInterim.className = 'text-zinc-400 italic';
                el.liveTranscriptText.appendChild(spanInterim);
            }
            spanInterim.textContent = interim;
        }

        // Rola para o final apenas quando há novo texto interim (usuário está falando)
        if (interim && el.liveTranscriptBox) {
            el.liveTranscriptBox.scrollTop = el.liveTranscriptBox.scrollHeight;
        }
    }

    // Para o recognition com flush do texto pendente (sem acionar o onend de reinício)
    function stopRecognition() {
        if (!recognition) return;
        if (recognition._flush) recognition._flush();
        recognition.onend = null; // impede auto-restart
        try { recognition.stop(); } catch (_) {}
        recognition = null;
    }

    // ── Guided modal para captura de aba (consulta online) ───────────────────
    function openOnlineGuideAndCapture() {
        return new Promise((resolve, reject) => {
            const modal      = document.getElementById('online-guide-modal');
            const btnConfirm = document.getElementById('online-guide-confirm');
            const btnCancel  = document.getElementById('online-guide-cancel');
            const errDiv     = document.getElementById('online-guide-error');
            const errText    = document.getElementById('online-guide-error-text');

            modal.classList.remove('hidden');

            function showModalError(msg) {
                if (errText) errText.textContent = msg;
                errDiv?.classList.remove('hidden');
                errDiv?.classList.add('flex');
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = '<i class="ph ph-arrow-clockwise text-base"></i> Tentar novamente';
            }

            function closeModal() {
                modal.classList.add('hidden');
                errDiv?.classList.add('hidden');
                errDiv?.classList.remove('flex');
                btnConfirm.disabled = false;
                btnConfirm.innerHTML = '<i class="ph ph-arrow-right text-base"></i> Entendido — Abrir seletor';
                btnConfirm.removeEventListener('click', onConfirm);
                btnCancel.removeEventListener('click', onCancel);
            }

            async function onConfirm() {
                btnConfirm.disabled = true;
                btnConfirm.innerHTML = '<i class="ph ph-circle-notch animate-spin text-base"></i> Aguardando seleção...';
                errDiv?.classList.add('hidden');
                errDiv?.classList.remove('flex');

                try {
                    const display = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
                    display.getVideoTracks().forEach(t => t.stop());

                    if (!display.getAudioTracks().length) {
                        display.getTracks().forEach(t => t.stop());
                        showModalError('Áudio não capturado. Volte ao passo 3 e marque "Compartilhar áudio da aba" antes de clicar Compartilhar.');
                        return;
                    }

                    closeModal();
                    resolve(display);
                } catch (err) {
                    if (err.name === 'NotAllowedError' || err.name === 'AbortError') {
                        closeModal();
                        reject(err);
                    } else {
                        showModalError(`Erro inesperado: ${err.message}. Tente novamente.`);
                    }
                }
            }

            function onCancel() {
                closeModal();
                reject(new Error('cancelled'));
            }

            btnConfirm.addEventListener('click', onConfirm);
            btnCancel.addEventListener('click', onCancel);
        });
    }

    // ── Start recording ───────────────────────────────────────────────────────
    el.btnStart.addEventListener('click', async () => {
        hideMicError();

        // Modo online: mostra guia e captura áudio da aba
        let capturedDisplay = null;
        if (isOnlineMode) {
            try {
                capturedDisplay = await openOnlineGuideAndCapture();
            } catch (_) {
                return; // usuário cancelou ou fechou o seletor
            }
        }

        let stream;
        try {
            // Em modo online: sem sampleRate fixo e sem echoCancellation para evitar
            // mismatch de sample rate com o áudio da aba e cancelamento acidental do paciente
            const micConstraints = isOnlineMode
                ? { audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }
                : { audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1, sampleRate: 16000 } };
            stream = await navigator.mediaDevices.getUserMedia(micConstraints);
        } catch (err) {
            capturedDisplay?.getTracks().forEach(t => t.stop());
            handleMicError(err);
            return;
        }

        mediaStream = stream;

        // Mistura microfone + alto-falante quando no modo online
        let recorderStream = stream;
        if (isOnlineMode && capturedDisplay) {
            displayStream = capturedDisplay;
            mixAudioCtx   = new AudioContext();
            await mixAudioCtx.resume(); // garante que o contexto não está suspenso
            const dest       = mixAudioCtx.createMediaStreamDestination();
            const micSrc     = mixAudioCtx.createMediaStreamSource(stream);
            const displaySrc = mixAudioCtx.createMediaStreamSource(displayStream);
            micSrc.connect(dest);
            displaySrc.connect(dest);
            recorderStream = dest.stream;

            // Se o usuário parar de compartilhar externamente, encerra a gravação
            displayStream.getAudioTracks()[0].onended = () => {
                if (mediaStream?.active) el.btnStop?.click();
            };
        }

        // Finaliza sessão anterior (se houver) e cria nova
        if (currentSessionId) SessionManager.finalizeSession(currentSessionId);
        const _sess      = SessionManager.createSession();
        currentSessionId = _sess.id;

        // Reset acumuladores para nova gravação
        accumulatedTranscript = '';
        _liveBoxLastFinal     = '';
        window.lastAudioBlob  = null;

        // MediaRecorder usa o stream misto (ou só microfone)
        audioChunks = [];
        const mime  = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
            ? 'audio/webm;codecs=opus' : 'audio/webm';
        mediaRecorder = new MediaRecorder(recorderStream, { mimeType: mime });
        mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunks.push(e.data); };
        mediaRecorder.start(1000);

        // SpeechRecognition usa apenas o microfone (limitação da API do navegador)
        if (hasSpeechAPI) {
            recognition = buildRecognition(
                (final, interim) => updateLiveBox(final, interim),
                (code) => { if (code === 'not-allowed') showMicError('Permissão de microfone bloqueada.'); },
                (texto) => {
                    SessionManager.saveChunk(currentSessionId, texto);
                    setStatus('Salvando...', 'emerald');
                    setTimeout(() => { if (!isPaused) setStatus('Gravando e transcrevendo ao vivo...', 'red'); }, 1200);
                }
            );
            try { recognition.start(); } catch (_) {}
        } else {
            if (el.liveTranscriptText)
                el.liveTranscriptText.textContent = 'Áudio capturado. Transcrição ao vivo requer Chrome ou Edge.';
        }

        // Mostra/oculta nota do modo online
        if (elOnlineNote) {
            if (isOnlineMode) {
                elOnlineNote.classList.remove('hidden');
                elOnlineNote.classList.add('flex');
            } else {
                elOnlineNote.classList.add('hidden');
                elOnlineNote.classList.remove('flex');
            }
        }

        startVisualizer(stream, el.vizBars);

        el.stateIdle.classList.add('hidden');
        el.stateRecording.classList.remove('hidden');
        el.stateRecording.classList.add('flex', 'fade-in');
        el.glow.classList.replace('bg-emerald-500/0', 'bg-red-500/20');

        seconds = 0;
        el.timerDisplay.textContent = formatTime(seconds);
        timerInterval = setInterval(() => { seconds++; el.timerDisplay.textContent = formatTime(seconds); }, 1000);

        setStatus('Gravando e transcrevendo ao vivo...', 'red');
        enableGenerateButton(false);
    });

    // ── Pause / Resume ────────────────────────────────────────────────────────
    if (el.btnPause) {
        el.btnPause.addEventListener('click', () => { isPaused ? resumeRecording() : pauseRecording(); });
    }

    function pauseRecording() {
        isPaused = true;
        clearInterval(timerInterval);

        if (mediaRecorder?.state === 'recording') mediaRecorder.pause();

        // Salva o texto da sessão atual antes de parar
        stopRecognition();
        if (currentSessionId) SessionManager.updateStatus(currentSessionId, 'pausada');

        stopVisualizer();

        if (el.pauseIcon)      el.pauseIcon.className   = 'ph ph-play text-xl';
        if (el.pauseLabel)     el.pauseLabel.textContent = 'Continuar';
        if (el.recordingLabel) {
            el.recordingLabel.textContent = 'Pausado';
            el.recordingLabel.classList.replace('text-red-500', 'text-amber-500');
            el.recordingLabel.classList.remove('animate-pulse');
        }
        el.btnPause?.classList.add('border-amber-400', 'text-amber-500');
        el.btnPause?.classList.remove('border-zinc-200', 'text-zinc-600');
        el.glow.classList.replace('bg-red-500/20', 'bg-amber-500/10');
        setStatus('Consulta pausada', 'amber');
    }

    function resumeRecording() {
        isPaused = false;
        if (currentSessionId) SessionManager.updateStatus(currentSessionId, 'em_andamento');

        timerInterval = setInterval(() => { seconds++; el.timerDisplay.textContent = formatTime(seconds); }, 1000);

        if (mediaRecorder?.state === 'paused') mediaRecorder.resume();

        // Nova instância de recognition — accumulatedTranscript já tem o texto anterior
        if (hasSpeechAPI && mediaStream?.active) {
            recognition = buildRecognition(
                (final, interim) => updateLiveBox(final, interim),
                () => {},
                (texto) => {
                    SessionManager.saveChunk(currentSessionId, texto);
                    setStatus('Salvando...', 'emerald');
                    setTimeout(() => { if (!isPaused) setStatus('Gravando e transcrevendo ao vivo...', 'red'); }, 1200);
                }
            );
            try { recognition.start(); } catch (_) {}
        }

        if (mediaStream) startVisualizer(mediaStream, el.vizBars);

        if (el.pauseIcon)      el.pauseIcon.className   = 'ph ph-pause text-xl';
        if (el.pauseLabel)     el.pauseLabel.textContent = 'Pausar';
        if (el.recordingLabel) {
            el.recordingLabel.textContent = 'Gravando';
            el.recordingLabel.classList.replace('text-amber-500', 'text-red-500');
            el.recordingLabel.classList.add('animate-pulse');
        }
        el.btnPause?.classList.remove('border-amber-400', 'text-amber-500');
        el.btnPause?.classList.add('border-zinc-200', 'text-zinc-600');
        el.glow.classList.replace('bg-amber-500/10', 'bg-red-500/20');
        setStatus('Consulta retomada — gravando...', 'red');
    }

    // ── Stop recording ────────────────────────────────────────────────────────
    el.btnStop.addEventListener('click', () => {
        isPaused = false;
        clearInterval(timerInterval);
        stopVisualizer();

        // Salva o texto da sessão atual antes de parar
        stopRecognition();
        if (currentSessionId) SessionManager.finalizeSession(currentSessionId);

        // Coleta o áudio final
        if (mediaRecorder?.state !== 'inactive') {
            mediaRecorder.onstop = () => {
                window.lastAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            };
            mediaRecorder.stop();
        }
        mediaStream?.getTracks().forEach(t => t.stop());
        mediaStream = null;
        stopDisplayStream();

        // Oculta nota do modo online
        if (elOnlineNote) {
            elOnlineNote.classList.add('hidden');
            elOnlineNote.classList.remove('flex');
        }

        // O texto do SpeechRecognition serve apenas de rascunho visual.
        // Usa os chunks consolidados do SessionManager como fonte primária —
        // são salvos atomicamente durante toda a gravação e são mais completos.
        const chunksDraft = currentSessionId
            ? SessionManager.getConsolidatedTranscript(currentSessionId)
            : '';
        const draft = (chunksDraft || accumulatedTranscript).trim();
        if (el.storedTranscript) {
            el.storedTranscript.value = draft;
            updateWordCount(draft);
        }
        localStorage.setItem(TRANSCRIPT_STORAGE_KEY, draft);

        // Salva rascunho no Supabase (background)
        if (window.DB && currentSessionId) {
            const supabaseId = SessionManager.getSupabaseId(currentSessionId);
            if (supabaseId) DB.saveTranscriptDraft(supabaseId, draft).catch(() => {});
        }

        setStatus('Gravação encerrada — clique em "Gerar Resumo" para processar', 'emerald');
        enableGenerateButton(true);

        el.stateRecording.classList.add('hidden');
        el.stateRecording.classList.remove('flex');
        el.stateIdle.classList.remove('hidden');
        el.glow.classList.replace('bg-red-500/20', 'bg-emerald-500/0');
    });

    // ── Generate Summary ──────────────────────────────────────────────────────
    if (el.btnGenerateSummary) {
        el.btnGenerateSummary.addEventListener('click', () => {
            el.stateIdle.classList.add('hidden');
            el.stateRecording.classList.add('hidden');
            el.stateRecording.classList.remove('flex');
            el.stateProcessing.classList.remove('hidden');
            el.stateProcessing.classList.add('flex', 'fade-in');
            el.glow.classList.replace('bg-emerald-500/0', 'bg-emerald-500/20');

            setStatus('Processando...', 'violet');
            enableGenerateButton(false);
            runProcessingPipeline(app);
        });
    }

    // ── Upload de Áudio ───────────────────────────────────────────────────────
    const elUp = {
        card:         document.getElementById('upload-audio-card'),
        dropZone:     document.getElementById('upload-drop-zone'),
        fileInput:    document.getElementById('audio-file-input'),
        fileSelected: document.getElementById('upload-file-selected'),
        fileName:     document.getElementById('upload-file-name'),
        fileSize:     document.getElementById('upload-file-size'),
        fileClear:    document.getElementById('upload-file-clear'),
        errorBanner:  document.getElementById('upload-error-banner'),
        errorText:    document.getElementById('upload-error-text'),
        btnProcess:   document.getElementById('btn-process-upload'),
    };

    const MAX_UPLOAD_MB = 25;

    function formatBytes(bytes) {
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    }

    function showUploadError(msg) {
        if (!elUp.errorBanner) return;
        elUp.errorText.textContent = msg;
        elUp.errorBanner.classList.remove('hidden');
        elUp.errorBanner.classList.add('flex');
    }

    function hideUploadError() {
        elUp.errorBanner?.classList.add('hidden');
        elUp.errorBanner?.classList.remove('flex');
    }

    function clearUploadState() {
        if (elUp.fileInput) elUp.fileInput.value = '';
        elUp.fileSelected?.classList.add('hidden');
        elUp.fileSelected?.classList.remove('flex');
        elUp.dropZone?.classList.remove('hidden');
        if (elUp.btnProcess) elUp.btnProcess.disabled = true;
        hideUploadError();
    }

    function applyUploadFile(file) {
        hideUploadError();
        if (!file) return;

        if (!file.type.startsWith('audio/') && !file.name.match(/\.(mp3|m4a|wav|webm|ogg|mp4|aac|flac)$/i)) {
            showUploadError('Formato inválido. Use MP3, M4A, WAV, WebM ou OGG.');
            return;
        }
        if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
            showUploadError(`Arquivo muito grande (${formatBytes(file.size)}). Limite: ${MAX_UPLOAD_MB} MB.`);
            return;
        }

        elUp.fileName.textContent = file.name;
        elUp.fileSize.textContent  = formatBytes(file.size);
        elUp.fileSelected?.classList.remove('hidden');
        elUp.fileSelected?.classList.add('flex');
        elUp.dropZone?.classList.add('hidden');
        if (elUp.btnProcess) elUp.btnProcess.disabled = false;

        // Disponibiliza para o pipeline (mesmo slot usado pela gravação ao vivo)
        window.lastAudioBlob = file;
    }

    if (elUp.fileInput) {
        elUp.fileInput.addEventListener('change', (e) => applyUploadFile(e.target.files?.[0]));
    }

    if (elUp.fileClear) {
        elUp.fileClear.addEventListener('click', () => {
            window.lastAudioBlob = null;
            clearUploadState();
        });
    }

    // Drag-and-drop
    if (elUp.dropZone) {
        elUp.dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elUp.dropZone.classList.add('border-emerald-400', 'bg-emerald-50/30');
        });
        elUp.dropZone.addEventListener('dragleave', () => {
            elUp.dropZone.classList.remove('border-emerald-400', 'bg-emerald-50/30');
        });
        elUp.dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            elUp.dropZone.classList.remove('border-emerald-400', 'bg-emerald-50/30');
            applyUploadFile(e.dataTransfer.files?.[0]);
        });
    }

    if (elUp.btnProcess) {
        elUp.btnProcess.addEventListener('click', () => {
            if (!window.lastAudioBlob) return;

            // Cria sessão local para rastrear (sem gravação de microfone)
            if (currentSessionId) SessionManager.finalizeSession(currentSessionId);
            const _sess      = SessionManager.createSession();
            currentSessionId = _sess.id;
            accumulatedTranscript = '';
            _liveBoxLastFinal     = '';

            // Mostra estado de processamento (reutiliza o mesmo do recorder)
            el.stateIdle.classList.add('hidden');
            el.stateProcessing.classList.remove('hidden');
            el.stateProcessing.classList.add('flex', 'fade-in');
            el.glow.classList.replace('bg-emerald-500/0', 'bg-emerald-500/20');
            if (elUp.card) elUp.card.classList.add('opacity-50', 'pointer-events-none');

            setStatus('Processando...', 'violet');
            enableGenerateButton(false);
            runProcessingPipeline(app);
        });
    }

    // Esconde o card de upload enquanto grava (e restaura ao parar)
    const _origBtnStartClick = el.btnStart.onclick;
    el.btnStart.addEventListener('click', () => {
        if (elUp.card) elUp.card.classList.add('hidden');
    });
    el.btnStop.addEventListener('click', () => {
        if (elUp.card) elUp.card.classList.remove('hidden');
    });

    // ── Copy transcript ───────────────────────────────────────────────────────
    if (el.btnCopyTranscript) {
        el.btnCopyTranscript.addEventListener('click', () => {
            const text = el.storedTranscript?.value;
            if (!text) return;
            navigator.clipboard.writeText(text).then(() => {
                const icon = el.btnCopyTranscript.querySelector('i');
                icon.className = 'ph ph-check text-sm';
                el.btnCopyTranscript.classList.add('text-emerald-500');
                setTimeout(() => {
                    icon.className = 'ph ph-copy text-sm';
                    el.btnCopyTranscript.classList.remove('text-emerald-500');
                }, 2000);
            });
        });
    }

    // ── Clear transcript ──────────────────────────────────────────────────────
    if (el.btnClearTranscript) {
        el.btnClearTranscript.addEventListener('click', () => {
            if (el.storedTranscript) el.storedTranscript.value = '';
            localStorage.removeItem(TRANSCRIPT_STORAGE_KEY);
            accumulatedTranscript = '';
            window.lastAudioBlob  = null;
            if (currentSessionId) { SessionManager.clearChunks(currentSessionId); currentSessionId = null; }
            updateWordCount('');
            setStatus('Aguardando gravação...', 'zinc');
            enableGenerateButton(false);
        });
    }

    // Live word count ao editar manualmente
    if (el.storedTranscript) {
        el.storedTranscript.addEventListener('input', () => {
            const t = el.storedTranscript.value;
            updateWordCount(t);
            enableGenerateButton(t.trim().length > 0);
            if (t.trim()) setStatus('Editado manualmente', 'zinc');
        });
    }

    // ── Processing pipeline ───────────────────────────────────────────────────
    async function runProcessingPipeline(app) {
        const setProgress = (pct, text) => {
            el.progressBar.style.width = pct;
            el.statusText.textContent  = text;
        };

        try {
            if (typeof MedNoteAI === 'undefined' || !MedNoteAI.hasKey()) {
                setProgress('0%', 'Erro: API Key não configurada em ai.js.');
                setTimeout(resetRecorder, 3000);
                return;
            }

            let transcript;

            // Whisper é sempre a fonte principal quando há áudio gravado
            if (window.lastAudioBlob && window.lastAudioBlob.size > 0) {
                setProgress('25%', 'Transcrevendo com Whisper AI...');
                transcript = await MedNoteAI.transcribe(window.lastAudioBlob);

                // Atualiza o campo com a transcrição precisa do Whisper
                if (el.storedTranscript) {
                    el.storedTranscript.value = transcript;
                    updateWordCount(transcript);
                }
                localStorage.setItem(TRANSCRIPT_STORAGE_KEY, transcript);
                setStatus('Transcrição Whisper concluída', 'emerald');

            } else {
                // Sem áudio: lê TODOS os chunks da sessão atual (fonte mais completa),
                // com fallback para o campo de texto (edição manual ou sessão anterior).
                const chunksTranscript = currentSessionId
                    ? SessionManager.getConsolidatedTranscript(currentSessionId)
                    : '';
                transcript = chunksTranscript || el.storedTranscript?.value.trim() || '';
            }

            if (!transcript) {
                setProgress('0%', 'Erro: nenhum áudio ou texto disponível.');
                setTimeout(resetRecorder, 3000);
                return;
            }

            setProgress('50%', 'Gerando prontuário e resumo (GPT-4o)...');
            const doctorTemplate  = localStorage.getItem('mednote_template_doctor')  || '';
            const patientTemplate = localStorage.getItem('mednote_template_patient') || '';
            const systemPrompt    = localStorage.getItem('mednote_ai_system_prompt') || '';

            const summaries = await MedNoteAI.generateSummaries(
                transcript, doctorTemplate, patientTemplate, systemPrompt
            );

            setProgress('85%', 'Salvando consulta...');

            // ── Salva no Supabase como parte obrigatória do pipeline ──────────
            // Usa await para garantir persistência antes de navegar para resultados.
            // Se o createConsulta() ainda estava rodando em background (consulta curta),
            // cria o registro agora mesmo como fallback.
            if (window.DB) {
                try {
                    let supabaseId = currentSessionId
                        ? SessionManager.getSupabaseId(currentSessionId)
                        : null;

                    // Fallback: cria a consulta agora se o ID ainda não chegou
                    if (!supabaseId) {
                        supabaseId = await DB.createConsulta();
                        if (supabaseId && currentSessionId) {
                            SessionManager.setSupabaseId(currentSessionId, supabaseId);
                        }
                    }

                    if (supabaseId) {
                        await DB.saveConsultaResults({
                            patientName:          document.getElementById('patient-name-input')?.value.trim() || '',
                            consultaId:           supabaseId,
                            transcriptRascunho:   el.storedTranscript?.value || '',
                            transcriptWhisper:    transcript,
                            resultadoMedico:      summaries.doctor,
                            resultadoPaciente:    summaries.patient,
                            templateMedicoSnap:   doctorTemplate,
                            templatePacienteSnap: patientTemplate,
                            promptIaSnap:         systemPrompt,
                            duracaoSegundos:      seconds,
                        });

                        // Upload de áudio permanece em background (arquivo grande, não bloqueia)
                        if (window.lastAudioBlob && window.lastAudioBlob.size > 0) {
                            DB.uploadAudio(supabaseId, window.lastAudioBlob).catch(() => {});
                        }

                        // Atualiza a lista para estar pronta quando o médico navegar
                        if (typeof window.loadConsultasList === 'function') {
                            window.loadConsultasList().catch(() => {});
                        }
                    } else {
                        console.error('[MedNote] Não foi possível obter ID do Supabase para salvar a consulta.');
                    }
                } catch (saveErr) {
                    console.error('[MedNote] Erro ao salvar consulta no Supabase:', saveErr);
                }
            }

            setProgress('100%', 'Finalizado!');

            setTimeout(() => {
                resetRecorder();
                if (typeof renderRealResults === 'function') renderRealResults(summaries);
                app.navigateTo('results');
            }, 600);

        } catch (err) {
            console.error('[MedNote] Pipeline error:', err);
            setProgress('0%', `Erro: ${err.message}`);
            setTimeout(resetRecorder, 4000);
        }
    }

    function resetRecorder() {
        el.stateProcessing.classList.add('hidden');
        el.stateProcessing.classList.remove('flex');
        el.stateIdle.classList.remove('hidden');
        el.progressBar.style.width = '0%';
        el.glow.classList.replace('bg-emerald-500/20', 'bg-emerald-500/0');
        // Restaura card de upload caso tenha sido disparado por um upload
        if (elUp.card) elUp.card.classList.remove('opacity-50', 'pointer-events-none');
    }

    // Reseta o estado visual do recorder para nova consulta.
    // Chamado por results.js ao clicar em "Nova Consulta".
    window.resetRecorderView = () => {
        accumulatedTranscript = '';
        currentSessionId      = null;
        _liveBoxLastFinal     = '';
        if (el.storedTranscript) {
            el.storedTranscript.value = '';
            localStorage.removeItem(TRANSCRIPT_STORAGE_KEY);
        }
        updateWordCount('');
        enableGenerateButton(false);
        setStatus('Aguardando gravação...', 'zinc');
        if (el.liveTranscriptText) el.liveTranscriptText.innerHTML = '';

        // Reseta estado de upload
        window.lastAudioBlob = null;
        clearUploadState();
        if (elUp.card) elUp.card.classList.remove('hidden', 'opacity-50', 'pointer-events-none');
    };

    // ── Mic error handler ─────────────────────────────────────────────────────
    function handleMicError(err) {
        const messages = {
            NotAllowedError:      'Permissão de microfone negada. Clique no ícone de cadeado na barra do navegador.',
            PermissionDeniedError:'Permissão de microfone negada. Verifique as configurações do navegador.',
            NotFoundError:        'Nenhum microfone detectado. Conecte um dispositivo e tente novamente.',
            NotReadableError:     'Microfone em uso por outro aplicativo. Feche-o e tente novamente.',
            OverconstrainedError: 'Configuração de áudio não suportada pelo seu microfone.',
        };
        showMicError(messages[err.name] || `Erro: ${err.message}`);
        setStatus('Erro de microfone', 'red');
    }

    // ── Init: recupera sessão ativa ou transcrição anterior ───────────────────
    SessionManager.cleanup();
    const activeSession = SessionManager.getActiveSession();
    if (activeSession) {
        const consolidated = SessionManager.getConsolidatedTranscript(activeSession.id);
        if (consolidated) {
            currentSessionId      = activeSession.id;
            accumulatedTranscript = consolidated;
            if (el.storedTranscript) {
                el.storedTranscript.value = consolidated;
                updateWordCount(consolidated);
            }
            const msg = activeSession.status === 'pausada'
                ? 'Consulta pausada restaurada — edite ou gere o resumo'
                : 'Sessão anterior encontrada — transcrição restaurada';
            setStatus(msg, 'violet');
            enableGenerateButton(true);
        }
    } else {
        // Fallback: chave legada de sessão única (retrocompatibilidade)
        const saved = localStorage.getItem(TRANSCRIPT_STORAGE_KEY);
        if (saved && el.storedTranscript) {
            el.storedTranscript.value = saved;
            updateWordCount(saved);
            setStatus('Transcrição anterior restaurada', 'zinc');
            enableGenerateButton(true);
        }
    }
}
