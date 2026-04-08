// Edge Function: generate-summaries
// Recebe transcrição + templates e retorna prontuário médico e resumo do paciente via Gemini.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY  = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL    = 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin':  '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
      },
    });
  }

  try {
    // Verifica autenticação
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return json({ error: 'Não autorizado' }, 401);
    }

    const { transcript, doctorTemplate, patientTemplate, systemPrompt } = await req.json();
    if (!transcript) return json({ error: 'Campo "transcript" ausente' }, 400);

    const sysInstruction = systemPrompt ||
      'Você é um assistente médico especializado. Gere documentos clínicos precisos e bem estruturados em português do Brasil.';

    const prompt =
`${sysInstruction}

Abaixo está a transcrição de uma consulta médica. Gere dois documentos com base nos templates fornecidos.

## TEMPLATE — PRONTUÁRIO MÉDICO (para o médico):
${doctorTemplate || '(sem template — use formato clínico padrão)'}

## TEMPLATE — RESUMO DO PACIENTE (para o paciente):
${patientTemplate || '(sem template — use linguagem simples e acessível)'}

## TRANSCRIÇÃO DA CONSULTA:
${transcript}

Responda SOMENTE em JSON válido, sem texto fora do JSON, no seguinte formato:
{
  "doctor": "<prontuário médico completo aqui>",
  "patient": "<resumo do paciente completo aqui>"
}`;

    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
      },
    };

    const res = await fetch(
      `${GEMINI_BASE_URL}/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Gemini error ${res.status}: ${JSON.stringify(err)}`);
    }

    const data = await res.json();
    const raw  = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';

    let summaries: { doctor: string; patient: string };
    try {
      summaries = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) summaries = JSON.parse(match[0]);
      else throw new Error('Resposta da IA fora do formato esperado.');
    }

    return json(summaries);

  } catch (err) {
    console.error('[generate-summaries]', err);
    return json({ error: String(err) }, 500);
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────
function json(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type':                'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
