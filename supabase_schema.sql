-- ============================================================
-- MedNote AI — Schema Supabase
-- Execute este script no SQL Editor do Supabase:
-- Dashboard → SQL Editor → New Query → Cole e execute
-- ============================================================


-- ─────────────────────────────────────────────────────────────
-- FUNÇÕES AUXILIARES
-- ─────────────────────────────────────────────────────────────

-- Atualiza updated_at automaticamente em qualquer tabela
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ─────────────────────────────────────────────────────────────
-- 1. PROFILES — Dados do médico (estende auth.users)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                  uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name           text,
  specialty           text,
  -- Templates salvos pelo médico (sincronizados com o localStorage)
  template_medico     text,
  template_paciente   text,
  -- Prompt de sistema personalizado da IA
  ai_system_prompt    text,
  created_at          timestamptz DEFAULT now() NOT NULL,
  updated_at          timestamptz DEFAULT now() NOT NULL
);

-- Trigger: cria perfil automaticamente ao criar conta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, specialty)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'specialty'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2. CONSULTAS — Cada consulta médica realizada
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.consultas (
  id                      uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id                 uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,

  -- Estado da gravação (espelha o SessionManager do app)
  status                  text NOT NULL DEFAULT 'em_andamento'
                            CHECK (status IN ('em_andamento', 'pausada', 'finalizada')),

  -- Metadados da sessão
  duracao_segundos        integer DEFAULT 0,

  -- Transcrições
  transcript_rascunho     text,   -- Rascunho do SpeechRecognition (ao vivo)
  transcript_whisper      text,   -- Transcrição final e precisa do Whisper AI

  -- Resultados gerados pelo GPT-4o
  resultado_medico        text,   -- Prontuário médico
  resultado_paciente      text,   -- Resumo para o paciente

  -- Snapshots dos templates e prompt usados na geração (histórico imutável)
  template_medico_snap    text,
  template_paciente_snap  text,
  prompt_ia_snap          text,

  -- Caminho do áudio no Supabase Storage (audio-consultas/{user_id}/{id}/recording.webm)
  audio_path              text,

  created_at              timestamptz DEFAULT now() NOT NULL,
  updated_at              timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_consultas_user_created ON public.consultas (user_id, created_at DESC);
CREATE INDEX idx_consultas_status       ON public.consultas (user_id, status);

CREATE TRIGGER set_consultas_updated_at
  BEFORE UPDATE ON public.consultas
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 3. TRANSCRICAO_CHUNKS — Pedaços da transcrição ao vivo
--    Espelha o SessionManager.saveChunk() do session.js
-- ─────────────────────────────────────────────────────────────
CREATE TABLE public.transcricao_chunks (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  consulta_id  uuid REFERENCES public.consultas(id) ON DELETE CASCADE NOT NULL,
  user_id      uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ordem        integer NOT NULL DEFAULT 0,   -- posição do chunk na sessão
  texto        text NOT NULL,
  criado_em    timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_chunks_consulta_ordem ON public.transcricao_chunks (consulta_id, ordem);


-- ─────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Cada médico vê e edita APENAS seus próprios dados
-- ─────────────────────────────────────────────────────────────

ALTER TABLE public.profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultas          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcricao_chunks ENABLE ROW LEVEL SECURITY;

-- PROFILES
CREATE POLICY "Médico lê próprio perfil"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Médico edita próprio perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- CONSULTAS
CREATE POLICY "Médico lê próprias consultas"
  ON public.consultas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Médico cria consultas"
  ON public.consultas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico atualiza próprias consultas"
  ON public.consultas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Médico deleta próprias consultas"
  ON public.consultas FOR DELETE
  USING (auth.uid() = user_id);

-- CHUNKS
CREATE POLICY "Médico lê próprios chunks"
  ON public.transcricao_chunks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Médico insere chunks"
  ON public.transcricao_chunks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Médico deleta próprios chunks"
  ON public.transcricao_chunks FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- STORAGE — Bucket para áudios das consultas
-- Execute separadamente no SQL Editor após criar o bucket
-- manualmente em: Storage → New Bucket → "audio-consultas" (private)
-- ─────────────────────────────────────────────────────────────

-- Política: médico faz upload apenas na própria pasta
CREATE POLICY "Médico faz upload do próprio áudio"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'audio-consultas'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: médico lê apenas o próprio áudio
CREATE POLICY "Médico lê próprio áudio"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'audio-consultas'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Política: médico deleta apenas o próprio áudio
CREATE POLICY "Médico deleta próprio áudio"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'audio-consultas'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
