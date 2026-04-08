// MedNote AI — AI Module (ai.js)
// Chama as Supabase Edge Functions para transcrição (Gemini) e geração de resumos.
// A GEMINI_API_KEY fica exclusivamente no servidor — nunca exposta no frontend.

const SUPABASE_FUNCTIONS_URL = `${window.__SUPABASE_URL__}/functions/v1`;

const MedNoteAI = {

    hasKey() {
        // Com Edge Functions, não há chave no frontend — sempre habilitado se autenticado
        return true;
    },

    // ── Transcrição de áudio via Edge Function → Gemini ──────────────────────
    async transcribe(audioBlob) {
        const token = await getAuthToken();

        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');

        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/transcribe`, {
            method:  'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey':        window.__SUPABASE_ANON_KEY__,
            },
            body: formData,
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Erro ${res.status} na transcrição`);
        return data.transcript;
    },

    // ── Geração de resumos via Edge Function → Gemini ─────────────────────────
    async generateSummaries(transcript, doctorTemplate, patientTemplate, systemPrompt) {
        const token = await getAuthToken();

        const res = await fetch(`${SUPABASE_FUNCTIONS_URL}/generate-summaries`, {
            method:  'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'apikey':        window.__SUPABASE_ANON_KEY__,
                'Content-Type':  'application/json',
            },
            body: JSON.stringify({ transcript, doctorTemplate, patientTemplate, systemPrompt }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || `Erro ${res.status} na geração de resumos`);
        return data;
    },
};

// ── Helper: token JWT do usuário autenticado ──────────────────────────────────
async function getAuthToken() {
    const { session } = await AuthModule.getSession();
    if (!session?.access_token) throw new Error('Usuário não autenticado.');
    return session.access_token;
}

window.MedNoteAI = MedNoteAI;
