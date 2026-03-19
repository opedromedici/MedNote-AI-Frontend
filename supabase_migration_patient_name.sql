-- MedNote AI — Migration: add patient_name to consultas
-- Execute no SQL Editor do Supabase

ALTER TABLE public.consultas ADD COLUMN IF NOT EXISTS patient_name text;
CREATE INDEX IF NOT EXISTS idx_consultas_patient_name ON public.consultas (user_id, patient_name);
