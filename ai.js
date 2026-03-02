// MedNote AI — OpenAI Integration Module (ai.js)
// ATENÇÃO: substitua OPENAI_API_KEY pela sua nova chave após revogar a atual.

const OPENAI_API_KEY = 'SUA_CHAVE_OPENAI_AQUI'; // Nunca commitar chaves reais — use .env

const MedNoteAI = {

    hasKey() {
        return OPENAI_API_KEY.startsWith('sk-') && OPENAI_API_KEY.length > 20;
    },

    // ── Whisper: transcrição de áudio ─────────────────────────────────────────
    async transcribe(audioBlob) {
        const formData = new FormData();
        formData.append('file', audioBlob, 'recording.webm');
        formData.append('model', 'whisper-1');
        formData.append('language', 'pt');
        formData.append('response_format', 'text');

        const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
            body: formData,
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `Whisper erro ${res.status}`);
        }

        return await res.text();
    },

    // ── GPT-4o: geração dos resumos ───────────────────────────────────────────
    async generateSummaries(transcript, doctorTemplate, patientTemplate, systemPrompt) {
        const sysContent = systemPrompt ||
            'Você é um assistente médico especializado. Gere documentos clínicos precisos e bem estruturados em português.';

        const userContent =
`Abaixo está a transcrição de uma consulta médica. Gere dois documentos com base nos templates fornecidos.

## TEMPLATE — PRONTUÁRIO MÉDICO (para o médico):
${doctorTemplate}

## TEMPLATE — RESUMO DO PACIENTE (para o paciente):
${patientTemplate}

## TRANSCRIÇÃO DA CONSULTA:
${transcript}

Responda SOMENTE em JSON válido, sem texto fora do JSON, no seguinte formato:
{
  "doctor": "<prontuário médico completo aqui>",
  "patient": "<resumo do paciente completo aqui>"
}`;

        const res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o',
                messages: [
                    { role: 'system', content: sysContent },
                    { role: 'user',   content: userContent },
                ],
                temperature: 0.2,
                response_format: { type: 'json_object' },
            }),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err?.error?.message || `GPT erro ${res.status}`);
        }

        const data = await res.json();
        const raw  = data.choices[0].message.content;

        try {
            return JSON.parse(raw);
        } catch {
            const match = raw.match(/\{[\s\S]*\}/);
            if (match) return JSON.parse(match[0]);
            throw new Error('Resposta da IA fora do formato esperado.');
        }
    },
};
