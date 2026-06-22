-- ============================================
-- FIX: Infinite Recursion na função get_my_company_id
-- ============================================

-- A função original causava um loop infinito porque a política da tabela 
-- profiles chamava a função, e a função consultava a tabela profiles.
-- Ao adicionar SECURITY DEFINER, a função ignora o RLS e quebra o loop.
CREATE OR REPLACE FUNCTION get_my_company_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;
