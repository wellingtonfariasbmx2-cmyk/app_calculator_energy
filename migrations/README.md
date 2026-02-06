# Migrations do Banco de Dados

Este diretório contém as migrations SQL para o banco de dados Supabase.

## Como Aplicar Migrations

### Opção 1: Via Supabase Dashboard (Recomendado para testes)
1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em "SQL Editor"
4. Copie e cole o conteúdo do arquivo de migration
5. Execute a query

### Opção 2: Via Supabase CLI
```bash
# Instalar Supabase CLI (se ainda não tiver)
npm install -g supabase

# Login
supabase login

# Link com o projeto
supabase link --project-ref hvjojxyogbqxvfwtacis

# Aplicar migration
supabase db push
```

## Migrations Disponíveis

### 001_events_system.sql
**Descrição:** Sistema de eventos com gestão automática de estoque

**Cria:**
- Tabela `events` - Eventos
- Tabela `equipment_allocations` - Alocações de equipamentos
- Campo `event_id` na tabela `distribution_projects`
- Índices de performance
- Políticas RLS
- View `equipment_availability` para cálculo de disponibilidade

**Status:** Pendente de aplicação

## Ordem de Execução

Execute as migrations na ordem numérica:
1. 001_events_system.sql

## Rollback

Para reverter uma migration, você precisará criar uma migration reversa manualmente.
