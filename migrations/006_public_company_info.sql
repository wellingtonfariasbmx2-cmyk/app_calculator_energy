-- Migração: Função pública para resgate de dados básicos da empresa por ID
-- Isso permite exibir Logo e Nome em "Portais" whitelabel de Login sem estar autenticado.

CREATE OR REPLACE FUNCTION get_company_public_info(p_company_id UUID)
RETURNS TABLE (
    id UUID,
    name TEXT,
    logo_url TEXT
) AS $$
BEGIN
    RETURN QUERY 
    SELECT c.id, c.name, c.logo_url 
    FROM public.companies c 
    WHERE c.id = p_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permite que usuários anônimos (deslogados) possam chamar essa função na tela de login
GRANT EXECUTE ON FUNCTION get_company_public_info(UUID) TO anon;
GRANT EXECUTE ON FUNCTION get_company_public_info(UUID) TO authenticated;
