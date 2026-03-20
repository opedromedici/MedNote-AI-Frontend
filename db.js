// MedNote AI — Supabase DB Module (db.js)
// Todas as operações de banco de dados.
// Estratégia: localStorage = fallback imediato, Supabase = fonte de verdade.

const DB = (() => {
    let _client = null;

    // Aguarda o SDK do Supabase e retorna o client autenticado
    async function getClient() {
        if (_client) return _client;
        await new Promise(resolve => {
            const check = () => window.supabase ? resolve() : setTimeout(check, 30);
            check();
        });
        _client = window.supabase.createClient(
            window.__SUPABASE_URL__,
            window.__SUPABASE_ANON_KEY__
        );
        return _client;
    }

    async function getUserId() {
        const { session } = await AuthModule.getSession();
        return session?.user?.id ?? null;
    }


    // ─────────────────────────────────────────────────────────────
    // PERFIL DO MÉDICO
    // ─────────────────────────────────────────────────────────────

    async function loadProfile() {
        const userId = await getUserId();
        if (!userId) return null;
        const client = await getClient();
        const { data, error } = await client
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) { console.warn('[DB] loadProfile:', error.message); return null; }
        return data;
    }

    async function saveProfile(updates) {
        const userId = await getUserId();
        if (!userId) return;
        const client = await getClient();
        const { error } = await client
            .from('profiles')
            .update(updates)
            .eq('id', userId);
        if (error) console.warn('[DB] saveProfile:', error.message);
    }


    // ─────────────────────────────────────────────────────────────
    // CONSULTAS
    // ─────────────────────────────────────────────────────────────

    async function createConsulta() {
        const userId = await getUserId();
        if (!userId) return null;
        const client = await getClient();
        const { data, error } = await client
            .from('consultas')
            .insert({ user_id: userId, status: 'em_andamento' })
            .select('id')
            .single();
        if (error) { console.warn('[DB] createConsulta:', error.message); return null; }
        return data.id;
    }

    async function updateConsultaStatus(consultaId, status) {
        if (!consultaId) return;
        const client = await getClient();
        const { error } = await client
            .from('consultas')
            .update({ status })
            .eq('id', consultaId);
        if (error) console.warn('[DB] updateConsultaStatus:', error.message);
    }

    async function saveTranscriptDraft(consultaId, transcript) {
        if (!consultaId || !transcript) return;
        const client = await getClient();
        const { error } = await client
            .from('consultas')
            .update({ transcript_rascunho: transcript })
            .eq('id', consultaId);
        if (error) console.warn('[DB] saveTranscriptDraft:', error.message);
    }

    async function saveConsultaResults({
        patientName,
        consultaId, transcriptRascunho, transcriptWhisper,
        resultadoMedico, resultadoPaciente,
        templateMedicoSnap, templatePacienteSnap, promptIaSnap,
        duracaoSegundos
    }) {
        if (!consultaId) return;
        const client = await getClient();

        const basePayload = {
            status:                 'finalizada',
            duracao_segundos:       duracaoSegundos ?? 0,
            transcript_rascunho:    transcriptRascunho  ?? null,
            transcript_whisper:     transcriptWhisper   ?? null,
            resultado_medico:       resultadoMedico     ?? null,
            resultado_paciente:     resultadoPaciente   ?? null,
            template_medico_snap:   templateMedicoSnap  ?? null,
            template_paciente_snap: templatePacienteSnap ?? null,
            prompt_ia_snap:         promptIaSnap        ?? null,
        };

        let { error } = await client
            .from('consultas')
            .update({ ...basePayload, patient_name: patientName ?? null })
            .eq('id', consultaId);

        if (error) {
            // Coluna patient_name ainda não existe — tenta sem ela
            if (error.message?.includes('patient_name')) {
                const { error: e2 } = await client
                    .from('consultas')
                    .update(basePayload)
                    .eq('id', consultaId);
                if (e2) {
                    console.warn('[DB] saveConsultaResults (fallback):', e2.message);
                    throw new Error(e2.message); // propaga para o pipeline exibir ao usuário
                }
            } else {
                console.warn('[DB] saveConsultaResults:', error.message);
                throw new Error(error.message); // propaga para o pipeline exibir ao usuário
            }
        }
    }

    async function listConsultas(search = '') {
        const userId = await getUserId();
        if (!userId) return [];
        const client = await getClient();

        const buildQuery = (withPatientName) => {
            const cols = withPatientName
                ? 'id, patient_name, status, duracao_segundos, created_at, resultado_medico, resultado_paciente, transcript_whisper, transcript_rascunho'
                : 'id, status, duracao_segundos, created_at, resultado_medico, resultado_paciente, transcript_whisper, transcript_rascunho';
            let q = client
                .from('consultas')
                .select(cols)
                .eq('user_id', userId)
                .not('resultado_medico', 'is', null)  // mostra qualquer consulta com resultado, independente do status
                .order('created_at', { ascending: false });
            if (withPatientName && search.trim()) q = q.ilike('patient_name', `%${search.trim()}%`);
            return q;
        };

        let { data, error } = await buildQuery(true);

        // Coluna patient_name ainda não existe no banco — tenta sem ela
        if (error?.message?.includes('patient_name')) {
            console.info('[DB] listConsultas: patient_name ausente, buscando sem ela');
            const res2 = await buildQuery(false);
            data  = res2.data;
            error = res2.error;
        }

        if (error) { console.warn('[DB] listConsultas:', error.message); return []; }
        return data ?? [];
    }


    // ─────────────────────────────────────────────────────────────
    // CHUNKS DE TRANSCRIÇÃO
    // ─────────────────────────────────────────────────────────────

    async function saveChunk(consultaId, ordem, texto) {
        const userId = await getUserId();
        if (!consultaId || !userId || !texto?.trim()) return;
        const client = await getClient();
        const { error } = await client
            .from('transcricao_chunks')
            .insert({ consulta_id: consultaId, user_id: userId, ordem, texto: texto.trim() });
        if (error) console.warn('[DB] saveChunk:', error.message);
    }

    async function deleteChunks(consultaId) {
        if (!consultaId) return;
        const client = await getClient();
        const { error } = await client
            .from('transcricao_chunks')
            .delete()
            .eq('consulta_id', consultaId);
        if (error) console.warn('[DB] deleteChunks:', error.message);
    }


    // ─────────────────────────────────────────────────────────────
    // ÁUDIO — Supabase Storage
    // ─────────────────────────────────────────────────────────────

    async function uploadAudio(consultaId, audioBlob) {
        const userId = await getUserId();
        if (!userId || !consultaId || !audioBlob || audioBlob.size === 0) return null;
        const client = await getClient();
        const path = `${userId}/${consultaId}/recording.webm`;
        const { error } = await client.storage
            .from('audio-consultas')
            .upload(path, audioBlob, { contentType: 'audio/webm', upsert: true });
        if (error) { console.warn('[DB] uploadAudio:', error.message); return null; }
        // Persiste o caminho na consulta
        await client.from('consultas').update({ audio_path: path }).eq('id', consultaId);
        return path;
    }


    return {
        loadProfile,
        saveProfile,
        createConsulta,
        updateConsultaStatus,
        saveTranscriptDraft,
        saveConsultaResults,
        listConsultas,
        saveChunk,
        deleteChunks,
        uploadAudio,
    };
})();

window.DB = DB;
