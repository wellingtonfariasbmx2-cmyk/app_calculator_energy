-- Migração para atualizar a trigger de criação de novos usuários 
-- para suportar entrada via link de convite sem criar uma nova empresa.

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  invite_company_uuid UUID;
BEGIN
  -- Tenta pegar o ID da empresa vindo dos metadados do cadastro
  BEGIN
    invite_company_uuid := (new.raw_user_meta_data->>'invite_company_id')::uuid;
  EXCEPTION WHEN OTHERS THEN
    invite_company_uuid := NULL;
  END;

  IF invite_company_uuid IS NOT NULL THEN
    -- Funcionário convidado: entra na empresa existente logada
    INSERT INTO public.profiles (id, company_id, role, email)
    VALUES (new.id, invite_company_uuid, 'employee', new.email);
  ELSE
    -- Requerente Normal: cria uma nova empresa
    INSERT INTO public.companies (name)
    VALUES ('Sua Empresa')
    RETURNING id INTO new_company_id;

    INSERT INTO public.profiles (id, company_id, role, email)
    VALUES (new.id, new_company_id, 'owner', new.email);
  END IF;
  
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
