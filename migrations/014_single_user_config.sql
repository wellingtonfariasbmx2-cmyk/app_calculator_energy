-- 014_single_user_config.sql
-- Movendo as configurações de marca (nome e logo da empresa) diretamente para o perfil do usuário
-- Isso permite manter os PDFs personalizados sem precisar de arquitetura multi-tenant

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS company_name TEXT,
ADD COLUMN IF NOT EXISTS company_logo TEXT;

-- Atualizar o perfil atual com um nome padrão se estiver nulo
UPDATE profiles SET company_name = 'StageFlow' WHERE company_name IS NULL;
