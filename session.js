// MedNote AI — Session Manager (session.js)
// Persiste consultas e chunks de transcrição no localStorage.
// Garante que nenhuma transcrição seja perdida em caso de refresh.

const SessionManager = (() => {
    const SESSIONS_KEY  = 'mednote_sessions';
    const CHUNKS_PREFIX = 'mednote_chunks_';

    // ── Helpers internos ──────────────────────────────────────────────────────

    function _getSessions() {
        try   { return JSON.parse(localStorage.getItem(SESSIONS_KEY)) || []; }
        catch { return []; }
    }

    function _saveSessions(sessions) {
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
    }

    function _getChunks(sessionId) {
        try   { return JSON.parse(localStorage.getItem(CHUNKS_PREFIX + sessionId)) || []; }
        catch { return []; }
    }

    function _saveChunks(sessionId, chunks) {
        localStorage.setItem(CHUNKS_PREFIX + sessionId, JSON.stringify(chunks));
    }

    function _touchSession(sessionId) {
        const sessions = _getSessions();
        const idx = sessions.findIndex(s => s.id === sessionId);
        if (idx !== -1) {
            sessions[idx].updated_at = new Date().toISOString();
            _saveSessions(sessions);
        }
    }

    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Cria uma nova consulta com status 'em_andamento'.
     * @returns {Object} sessão criada
     */
    function createSession() {
        const id  = 'sess_' + Date.now();
        const now = new Date().toISOString();
        const session = { id, status: 'em_andamento', created_at: now, updated_at: now };
        const sessions = _getSessions();
        sessions.push(session);
        _saveSessions(sessions);
        _saveChunks(id, []);
        return session;
    }

    /**
     * Atualiza o status de uma consulta.
     * @param {string} sessionId
     * @param {'em_andamento'|'pausada'|'finalizada'} status
     */
    function updateStatus(sessionId, status) {
        const sessions = _getSessions();
        const idx = sessions.findIndex(s => s.id === sessionId);
        if (idx === -1) return;
        sessions[idx].status     = status;
        sessions[idx].updated_at = new Date().toISOString();
        _saveSessions(sessions);
    }

    /**
     * Persiste um chunk de transcrição imediatamente.
     * @param {string} sessionId
     * @param {string} texto
     * @returns {Object|null} chunk salvo, ou null se texto vazio
     */
    function saveChunk(sessionId, texto) {
        if (!texto?.trim()) return null;
        const chunks = _getChunks(sessionId);
        const chunk  = {
            id:         'chunk_' + Date.now(),
            session_id: sessionId,
            ordem:      chunks.length,
            texto:      texto.trim(),
            criado_em:  new Date().toISOString(),
        };
        chunks.push(chunk);
        _saveChunks(sessionId, chunks);
        _touchSession(sessionId);
        return chunk;
    }

    /**
     * Limpa todos os chunks de uma sessão (usado em "Limpar transcrição").
     */
    function clearChunks(sessionId) {
        _saveChunks(sessionId, []);
        _touchSession(sessionId);
    }

    /**
     * Retorna a sessão ativa mais recente (em_andamento ou pausada), ou null.
     */
    function getActiveSession() {
        return _getSessions()
            .filter(s => s.status === 'em_andamento' || s.status === 'pausada')
            .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))[0] || null;
    }

    /**
     * Retorna os chunks de uma sessão ordenados por 'ordem'.
     */
    function getChunks(sessionId) {
        return _getChunks(sessionId).sort((a, b) => a.ordem - b.ordem);
    }

    /**
     * Concatena todos os chunks em uma transcrição consolidada.
     * É sempre esta versão que deve alimentar a geração de resumos.
     */
    function getConsolidatedTranscript(sessionId) {
        return getChunks(sessionId).map(c => c.texto).join(' ').trim();
    }

    /**
     * Marca a consulta como finalizada.
     */
    function finalizeSession(sessionId) {
        updateStatus(sessionId, 'finalizada');
    }

    /**
     * Remove sessões finalizadas com mais de 7 dias para não lotar o localStorage.
     * Chamado automaticamente no init do recorder.
     */
    function cleanup() {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const kept   = _getSessions().filter(s => {
            if (s.status === 'finalizada' && new Date(s.updated_at).getTime() < cutoff) {
                localStorage.removeItem(CHUNKS_PREFIX + s.id);
                return false;
            }
            return true;
        });
        _saveSessions(kept);
    }

    return {
        createSession,
        updateStatus,
        saveChunk,
        clearChunks,
        getActiveSession,
        getChunks,
        getConsolidatedTranscript,
        finalizeSession,
        cleanup,
    };
})();
