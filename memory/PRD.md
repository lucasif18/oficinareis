# Oficina Reis - Sistema de Gestão de Retificação de Motores

## Problema Original
Sistema de gestão web completo para oficina de retificação de motores com 8 módulos principais: Dashboard, Clientes, Peças, Ordens de Serviço, Orçamentos, Romaneio, Cadastros e Financeiro. O sistema deve suportar múltiplos níveis de acesso (ADM, Motorista, Funcionário, Cliente).

## Arquitetura
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + Motor (MongoDB async)
- **Database:** MongoDB
- **Auth:** JWT com múltiplos perfis de usuário
- **PDF:** WeasyPrint
- **Real-time:** WebSocket (para bloqueio de serviços)

## Módulos Implementados

### 1. Autenticação e Usuários
- Login JWT com 4 perfis: admin, funcionario, motorista, cliente
- Cadastro público com códigos de validação (ADM2024, FUNC2024, MOTORISTA2024)
- Restrições de menu e visualização por perfil

### 2. Dashboard
- Dashboard completo para admin com KPIs
- Dashboard restrito para funcionário (sem valores monetários)
- Alertas proativos (estoque baixo, orçamentos pendentes)

### 3. Clientes
- CRUD completo (PF/PJ)
- Busca e filtros
- Visualização detalhada com histórico de OS
- Botão "Visualizar" com navegação para /clientes/:id

### 4. Peças (Estoque)
- CRUD completo
- Alertas de estoque baixo
- **Entrada rápida de estoque** (novo modal)
- Histórico de movimentações
- Versão sem preços para funcionários (/pecas-consulta)

### 5. Ordens de Serviço
- Criação com serviços e peças
- Edição e exclusão (apenas admin)
- Atualização de status
- Geração de PDF profissional
- Histórico por cliente

### 6. Orçamentos
- CRUD completo
- Conversão para OS
- Geração de PDF

### 7. Romaneio (Entregas)
- Controle de entregas
- Atribuição de motorista
- Status (pendente, em_rota, concluído)
- Geração de PDF

### 8. Serviços do Funcionário
- Lista de serviços por setor do funcionário
- **Sistema de bloqueio em tempo real** (WebSocket + polling fallback)
- Iniciar e concluir serviços
- Indicador de conexão WebSocket

### 9. Financeiro
- Contas a Pagar/Receber
- Fluxo de Caixa
- DRE (Demonstração do Resultado)

### 10. Relatórios
- Relatório de OS por período
- Relatório de faturamento

### 11. Página Institucional
- Landing page pública
- Vídeo de fundo e informações da empresa

## Credenciais de Teste
- **Admin:** admin@oficinareis.com / admin123
- **Códigos:** ADM2024, FUNC2024, MOTORISTA2024

## Status: EM DESENVOLVIMENTO

### Concluído (Sessão Atual - 26/02/2026)
- [x] Rotas para dashboard/serviços/peças do funcionário
- [x] Botão "Visualizar" na lista de clientes
- [x] Entrada rápida de peças (modal)
- [x] WebSocket para bloqueio de serviços em tempo real
- [x] Campo 'nome' no JWT token
- [x] Correções de serialização MongoDB

### Próximas Tarefas (P1)
- [ ] Refatorar Romaneio para filtrar apenas OS 'pronto/concluído'
- [ ] Checkboxes de confirmação de entrega no Romaneio
- [ ] Dados do cliente no cabeçalho da OS

### Backlog (P2)
- [ ] Seletor de período anual nos Relatórios
- [ ] Criar/Editar "Setores" na Tabela de Preços
- [ ] Melhorias de acessibilidade (aria-describedby nos modais)
- [ ] Investigar estabilidade do WebSocket em produção
