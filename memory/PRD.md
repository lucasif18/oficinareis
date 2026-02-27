# Oficina Reis - Sistema de Gestão de Retificação de Motores

## Problema Original
Sistema de gestão web completo para oficina de retificação de motores com 8 módulos principais: Dashboard, Clientes, Peças, Ordens de Serviço, Orçamentos, Romaneio, Cadastros e Financeiro. O sistema suporta múltiplos níveis de acesso (ADM, Motorista, Funcionário, Cliente).

## Arquitetura
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + Motor (MongoDB async)
- **Database:** MongoDB
- **Auth:** JWT com múltiplos perfis de usuário
- **PDF:** WeasyPrint
- **Real-time:** WebSocket
- **Cores:** Azul (#1e3a5f) + Amarelo (#f59e0b)

## Segurança por Perfil
| Funcionalidade | Admin | Motorista | Funcionário | Cliente |
|----------------|-------|-----------|-------------|---------|
| Ver preços/valores | ✅ | ❌ | ❌ | ✅ (própria OS) |
| Upload de fotos | ✅ | ❌ | ❌ | ❌ |
| Dashboard financeiro | ✅ | ❌ | ❌ | ❌ |
| Editar/Excluir OS | ✅ | ❌ | ❌ | ❌ |
| Confirmar entrega | ✅ | ✅ | ❌ | ❌ |

## Módulos Implementados

### 1. Autenticação e Usuários
- Login JWT com 4 perfis: admin, funcionario, motorista, cliente
- Cadastro público com códigos de validação (ADM2024, FUNC2024, MOTORISTA2024)
- **Sanitização de valores** - funcionários/motoristas não veem preços

### 2. Dashboard (por perfil)
- **Admin:** Dashboard completo com KPIs, faturamento, notificações em tempo real
- **Funcionário:** Dashboard restrito (sem valores monetários)
- **Motorista:** Dashboard com contadores de romaneios e tabela de inadimplentes

### 3. Portal do Cliente (/area-cliente) ✨
- Timeline de progresso interativa (6 etapas) com cores amarelas
- Busca por número da OS ou CPF/CNPJ
- **Galeria "Relatório Visual de Qualidade"** (Antes/Depois)
- Atualização em tempo real via WebSocket

### 4. Ordens de Serviço ✨ MELHORADO
- **Upload de fotos** (apenas ADM) - Antes/Depois
- **Botão WhatsApp** para notificar cliente
- Dados do cliente no cabeçalho (CPF/CNPJ, telefone, email)
- Status: pendente → andamento → concluído → enviando → entregue

### 5. Notificações WhatsApp ✨ NOVO
- Link gerado automaticamente com mensagem formatada
- Mensagem inclui: nome do cliente, número da OS, status atual, link do portal
- ADM/Motorista podem enviar com 1 clique

### 6. Romaneio (Entregas)
- Filtra apenas OS com status "concluído"
- Ao criar romaneio, OS muda para "enviando"
- Checkboxes de confirmação de entrega por item
- Ao confirmar, OS muda para "entregue"

### 7. Financeiro
- Contas a Pagar/Receber
- Fluxo de Caixa
- DRE (Demonstração do Resultado)
- Lista de inadimplentes (débitos > 30 dias)

### 8. Relatórios
- Seletor de período anual
- Resumo anual completo
- Gráficos de faturamento mensal

### 9. Tabela de Preços
- CRUD de serviços por setor
- Gestão de setores (criar/editar/excluir)

## Credenciais de Teste
- **Admin:** admin@oficinareis.com / admin123
- **Códigos cadastro:** ADM2024, FUNC2024, MOTORISTA2024

## Status: FUNCIONAL ✅

### Concluído (Sessão 27/02/2026)
- [x] Cores Azul (#1e3a5f) e Amarelo (#f59e0b) em todo o sistema
- [x] Segurança de valores (sanitização no backend)
- [x] Upload de fotos na OS (apenas ADM)
- [x] Galeria "Relatório Visual de Qualidade" 
- [x] Notificações WhatsApp com link formatado
- [x] Sincronização de Timeline com status da OS
- [x] Dados do cliente completos (telefone, email, documento)

### Backlog Futuro
- [ ] Integração direta com API WhatsApp Business
- [ ] Notificações push automáticas
- [ ] Relatório de produtividade por funcionário
- [ ] App mobile para motoristas
