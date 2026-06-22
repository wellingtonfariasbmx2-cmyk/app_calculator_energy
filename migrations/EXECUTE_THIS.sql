-- ============================================
-- MIGRAÇÃO: Adicionar Upload de Riders PDF
-- ============================================
-- INSTRUÇÕES:
-- 1. Copie TODO este arquivo
-- 2. Acesse: https://supabase.com/dashboard/project/jvvqkqwcqfvdqkqwdlrr/sql/new
-- 3. Cole e execute
-- ============================================

-- Adicionar coluna rider_pdf_url à tabela events
ALTER TABLE events ADD COLUMN IF NOT EXISTS rider_pdf_url TEXT;

COMMENT ON COLUMN events.rider_pdf_url IS 'URL do PDF do rider de luz da banda no Supabase Storage';

-- ============================================
-- POLÍTICAS RLS PARA STORAGE
-- ============================================
-- OPÇÃO 1: Execute via SQL Editor (pode dar erro se já existir)
-- OPÇÃO 2: Configure manualmente em Storage > event_riders > Policies

-- Política 1: Permitir upload para usuários autenticados
CREATE POLICY "Authenticated users can upload riders"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'event_riders');

-- Política 2: Permitir leitura para usuários autenticados
CREATE POLICY "Authenticated users can read riders"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'event_riders');

-- Política 3: Permitir delete para usuários autenticados
CREATE POLICY "Authenticated users can delete riders"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'event_riders');

-- ============================================
-- PRONTO! A funcionalidade está ativa.
-- ============================================
-- Se as políticas já existirem, você verá um erro mas
-- a coluna rider_pdf_url será criada com sucesso.
-- ============================================
