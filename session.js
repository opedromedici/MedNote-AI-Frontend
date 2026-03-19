// MedNote AI — Session Manager (session.js)
// localStorage = fallback imediato (nunca perde transcrição).
// Supabase = fonte de verdade (sincronizado em background via DB module).

const SessionManager = (() => {
    const SESSIONS_KEY    = 'mednote_sessions';
    const CHUNKS_PREFIX   = 'mednote_chunks_';
    const SUPABASE_PREFIX = 'mednote_supabase_id_'; // mapeia localId → uuid do Supabase

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

    // Mapeamento localId ↔ UUID do Supabase
    function _getSupabaseId(localId) {
        return localStorage.getItem(SUPABASE_PREFIX + localId) || null;
    }

    function _setSupabaseId(localId, supabaseId) {
        if (supabaseId) localStorage.setItem(SUPABASE_PREFIX + localId, supabaseId);
    }

    function _removeSupabaseId(localId) {
        localStorage.removeItem(SUPABASE_PREFIX + localId);
    }


    // ── API pública ───────────────────────────────────────────────────────────

    /**
     * Cria uma nova consulta com status 'em_andamento'.
     * Persiste no localStorage imediatamente e cria no Supabase em background.
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

        // Cria no Supabase em background e armazena o UUID para uso futuro
        if (window.DB) {
            DB.createConsulta()
                .then(supabaseId => _setSupabaseId(id, supabaseId))
                .catch(() => {});
        }

        return session;
    }

    /**
     * Atualiza o status de uma consulta.
     */
    function updateStatus(sessionId, status) {
        const sessions = _getSessions();
        const idx = sessions.findIndex(s => s.id === sessionId);
        if (idx === -1) return;
        sessions[idx].status     = status;
        sessions[idx].updated_at = new Date().toISOString();
        _saveSessions(sessions);

        // Sync Supabase em background
        if (window.DB) {
            const supabaseId = _getSupabaseId(sessionId);
            if (supabaseId) DB.updateConsultaStatus(supabaseId, status).catch(() => {});
        }
    }

    /**
     * Persiste um chunk de transcrição imediatamente no localStorage
     * e envia ao Supabase em background.
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

        // Sync Supabase em background
        if (window.DB) {
            const supabaseId = _getSupabaseId(sessionId);
            if (supabaseId) DB.saveChunk(supabaseId, chunk.ordem, chunk.texto).catch(() => {});
        }

        return chunk;
    }

    /**
     * Limpa todos os chunks de uma sessão.
     */
    function clearChunks(sessionId) {
        _saveChunks(sessionId, []);
        _touchSession(sessionId);

        // Sync Supabase em background
        if (window.DB) {
            const supabaseId = _getSupabaseId(sessionId);
            if (supabaseId) DB.deleteChunks(supabaseId).catch(() => {});
        }
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
     * Retorna o UUID do Supabase mapeado para um localId.
     * Usado por recorder.js para salvar resultados e áudio.
     */
    function getSupabaseId(localId) {
        return _getSupabaseId(localId);
    }

    /**
     * Remove sessões finalizadas com mais de 7 dias.
     */
    function cleanup() {
        const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
        const kept   = _getSessions().filter(s => {
            if (s.status === 'finalizada' && new Date(s.updated_at).getTime() < cutoff) {
                localStorage.removeItem(CHUNKS_PREFIX + s.id);
                _removeSupabaseId(s.id);
                return false;
            }
            return true;
        });
        _saveSessions(kept);
    }

    /**
     * Armazena manualmente o UUID do Supabase para um localId.
     * Usado pelo pipeline de resultados quando createConsulta ainda estava em background.
     */
    function setSupabaseId(localId, supabaseId) {
        _setSupabaseId(localId, supabaseId);
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
        getSupabaseId,
        setSupabaseId,
        cleanup,
    };
})();
