# Guia de Teste - Sistema de Eventos

## 🚀 Como Testar Localmente

### Passo 1: Aplicar Migration no Banco de Dados

Antes de testar, você precisa aplicar a migration SQL no seu banco Supabase:

1. Acesse https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em **SQL Editor**
4. Copie todo o conteúdo do arquivo `migrations/001_events_system.sql`
5. Cole no editor e clique em **Run**

✅ Isso criará as tabelas `events`, `equipment_allocations` e adicionará o campo `event_id` em `distribution_projects`.

### Passo 2: Instalar Dependências (se necessário)

```bash
npm install
```

### Passo 3: Rodar o Projeto

```bash
npm run dev
```

### Passo 4: Testar Funcionalidades

#### ✅ Navegação
- Abra o app
- Verifique se o menu "Eventos" aparece como primeira opção
- Click em "Eventos" para abrir a view

#### ✅ Visualização de Eventos
- A tela de eventos deve carregar (vazia inicialmente)
- Filtros devem aparecer: Todos, Planejados, Em Andamento, Concluídos, Cancelados

#### ✅ Criar Evento (Temporário)
- Por enquanto, o botão "+" mostra um alert
- **Próximo passo:** Implementar o modal de criação

---

## 📋 O Que Foi Implementado

### ✅ Fase 1: Fundação do Banco de Dados
- [x] Migration SQL completa
- [x] Tabelas `events` e `equipment_allocations`
- [x] Campo `event_id` em `distribution_projects`
- [x] Índices de performance
- [x] RLS (Row Level Security)
- [x] View `equipment_availability`

### ✅ Fase 2: Tipos e Serviços
- [x] Tipos `Event` e `EquipmentAllocation`
- [x] Atualizado tipo `Equipment` com campos de disponibilidade
- [x] Atualizado tipo `DistributionProject` com `eventId`
- [x] `EventService.ts` completo com:
  - CRUD de eventos
  - Verificação de disponibilidade
  - Alocação/devolução automática
  - Finalizar/cancelar eventos

### ✅ Fase 3: Interface Básica (Parcial)
- [x] `EventsView.tsx` com:
  - Lista de eventos
  - Filtros por status
  - Ações: Finalizar, Cancelar, Excluir
  - Formatação de datas
  - Badges de status
- [x] Navegação integrada no App
- [ ] **Pendente:** `EventModal.tsx` para criar/editar eventos

---

## 🔜 Próximos Passos

### 1. Criar EventModal.tsx
- Formulário de criação/edição
- Seleção de equipamentos com verificação de disponibilidade
- Validação de campos

### 2. Gestão de Estoque
- Painel de disponibilidade em tempo real
- Alertas de conflito
- Timeline de alocações

### 3. Integração com Distribuição
- Criar projeto de distribuição do evento
- Vincular projetos existentes
- Visualizar projetos do evento

### 4. Calendário
- Visualização mensal/semanal
- Drag & drop (opcional)

---

## 🐛 Possíveis Problemas e Soluções

### Erro: "relation events does not exist"
**Solução:** Você precisa aplicar a migration SQL no Supabase (Passo 1)

### Erro de importação do EventService
**Solução:** Certifique-se de que o arquivo `services/EventService.ts` foi criado

### Eventos não carregam
**Solução:** 
1. Verifique se a migration foi aplicada
2. Verifique o console do navegador para erros
3. Verifique se as políticas RLS estão corretas

---

## 📝 Notas Importantes

- **Sem commits:** Conforme solicitado, nenhuma mudança foi commitada
- **Teste local:** Todas as mudanças estão apenas no seu ambiente local
- **Reversível:** Você pode descartar as mudanças se não gostar

---

## 💡 Dicas de Teste

1. **Crie um evento de teste:**
   - Por enquanto, você precisará criar manualmente via SQL Editor:
   ```sql
   INSERT INTO events (name, client_name, venue, start_date, end_date, status)
   VALUES ('Show Teste', 'Cliente Teste', 'Teatro Municipal', NOW(), NOW() + INTERVAL '1 day', 'planned');
   ```

2. **Verifique a view de disponibilidade:**
   ```sql
   SELECT * FROM equipment_availability;
   ```

3. **Teste a devolução automática:**
   - Crie um evento
   - Finalize o evento
   - Verifique se o status mudou para 'completed'

---

## 🎯 Feedback Necessário

Após testar, me informe:
1. ✅ A migration foi aplicada com sucesso?
2. ✅ A navegação está funcionando?
3. ✅ A lista de eventos carrega corretamente?
4. ✅ Os filtros funcionam?
5. 🤔 Quer que eu continue com o EventModal ou prefere ajustes primeiro?
