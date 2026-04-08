// Edge Function: transcribe
// Recebe um arquivo de áudio, envia ao Gemini e retorna a transcrição em texto.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GEMINI_API_KEY  = Deno.env.get('GEMINI_API_KEY') ?? '';
const GEMINI_MODEL    = 'gemini-2.0-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// Arquivos > 15 MB são enviados via Files API para evitar limite de inline base64
const MAX_INLINE_BYTES = 15 * 1024 * 1024;

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

    // Lê o áudio do body (multipart/form-data)
    const formData  = await req.formData();
    const audioFile = formData.get('file') as File | null;
    if (!audioFile) return json({ error: 'Campo "file" ausente' }, 400);

    const audioBytes = new Uint8Array(await audioFile.arrayBuffer());
    const mimeType   = audioFile.type || 'audio/webm';

    let transcript: string;

    if (audioBytes.length > MAX_INLINE_BYTES) {
      transcript = await transcribeViaFilesAPI(audioBytes, mimeType);
    } else {
      transcript = await transcribeInline(audioBytes, mimeType);
    }

    return json({ transcript });

  } catch (err) {
    console.error('[transcribe]', err);
    return json({ error: String(err) }, 500);
  }
});

// ── Transcrição com dado inline (< 15 MB) ────────────────────────────────────
async function transcribeInline(audioBytes: Uint8Array, mimeType: string): Promise<string> {
  const base64 = btoa(String.fromCharCode(...audioBytes));

  const body = {
    contents: [{
      parts: [
        {
          inline_data: { mime_type: mimeType, data: base64 },
        },
        {
          text: 'Transcreva este áudio em português do Brasil com fidelidade máxima. Retorne apenas a transcrição, sem comentários ou formatação adicional.',
        },
      ],
    }],
  };

  return await callGemini(body);
}

// ── Transcrição via Files API (>= 15 MB) ─────────────────────────────────────
async function transcribeViaFilesAPI(audioBytes: Uint8Array, mimeType: string): Promise<string> {
  // 1. Upload para a Files API
  const uploadRes = await fetch(
    `${GEMINI_BASE_URL}/files?key=${GEMINI_API_KEY}`,
    {
      method:  'POST',
      headers: {
        'Content-Type':  mimeType,
        'Content-Length': String(audioBytes.length),
        'X-Goog-Upload-Protocol': 'raw',
      },
      body: audioBytes,
    }
  );
  if (!uploadRes.ok) {
    const err = await uploadRes.json().catch(() => ({}));
    throw new Error(`Files API upload error: ${JSON.stringify(err)}`);
  }
  const { file } = await uploadRes.json();

  // 2. Referencia o arquivo no generateContent
  const body = {
    contents: [{
      parts: [
        { file_data: { mime_type: mimeType, file_uri: file.uri } },
        {
          text: 'Transcreva este áudio em português do Brasil com fidelidade máxima. Retorne apenas a transcrição, sem comentários ou formatação adicional.',
        },
      ],
    }],
  };

  const transcript = await callGemini(body);

  // 3. Deleta o arquivo após uso (boa prática)
  fetch(`${GEMINI_BASE_URL}/${file.name}?key=${GEMINI_API_KEY}`, { method: 'DELETE' }).catch(() => {});

  return transcript;
}

// ── Chamada genérica ao Gemini generateContent ────────────────────────────────
async function callGemini(body: object): Promise<string> {
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
  return data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? '';
}

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
