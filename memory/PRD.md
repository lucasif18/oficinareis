# Oficina Reis - Sistema de Gestão de Retificação de Motores

## Problema Original
Sistema de gestão web completo para oficina de retificação de motores com 8 módulos principais: Dashboard, Clientes, Peças, Ordens de Serviço, Orçamentos, Romaneio, Cadastros e Financeiro. O sistema suporta múltiplos níveis de acesso (ADM, Motorista, Funcionário, Cliente).

## Arquitetura
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + Motor (MongoDB async)
- **Database:** MongoDB
- **Auth:** JWT com múltiplos perfis de usuário
- **PDF:** WeasyPrint
- **Real-time:** WebSocket (para bloqueio de serviços e atualizações)

## Módulos Implementados

### 1. Autenticação e Usuários
- Login JWT com 4 perfis: admin, funcionario, motorista, cliente
- Cadastro público com códigos de validação (ADM2024, FUNC2024, MOTORISTA2024)
- Restrições de menu e visualização por perfil

### 2. Dashboard (por perfil)
- **Admin:** Dashboard completo com KPIs, faturamento, notificações em tempo real
- **Funcionário:** Dashboard restrito (sem valores monetários)
- **Motorista:** Dashboard com contadores de romaneios e tabela de inadimplentes

### 3. Portal do Cliente (/area-cliente) ✨ NOVO
- Timeline de progresso interativa (6 etapas)
- Busca por número da OS ou CPF/CNPJ
- Histórico de OS por cliente
- Card lateral com dados do veículo e técnicos responsáveis
- Atualização em tempo real via WebSocket

### 4. Clientes
- CRUD completo (PF/PJ)
- Busca e filtros
- Visualização detalhada com histórico de OS
- Botão "Visualizar" com navegação para /clientes/:id

### 5. Peças (Estoque)
- CRUD completo
- Alertas de estoque baixo
- Entrada rápida de estoque (modal)
- Versão sem preços para funcionários (/pecas-consulta)

### 6. Ordens de Serviço
- Criação com serviços e peças
- Edição e exclusão (apenas admin)
- Status: pendente → andamento → concluído → enviando → entregue
- Dados do cliente no cabeçalho (CPF/CNPJ, telefone, email)
- Geração de PDF profissional

### 7. Orçamentos
- CRUD completo
- Conversão para OS
- Geração de PDF

### 8. Romaneio (Entregas) ✨ MELHORADO
- Filtra apenas OS com status "concluído"
- Ao criar romaneio, OS muda para "enviando"
- Checkboxes de confirmação de entrega por item
- Ao confirmar, OS muda para "entregue"
- Geração de PDF

### 9. Serviços do Funcionário
- Lista de serviços por setor
- Sistema de bloqueio em tempo real (WebSocket + polling fallback)
- Iniciar e concluir serviços

### 10. Financeiro
- Contas a Pagar/Receber
- Fluxo de Caixa
- DRE (Demonstração do Resultado)
- Lista de inadimplentes (débitos > 30 dias)

### 11. Relatórios ✨ MELHORADO
- Seletor de período anual
- Resumo anual por ano selecionado
- Gráficos de faturamento mensal

### 12. Tabela de Preços ✨ MELHORADO
- CRUD de serviços por setor
- Gestão de setores (criar/editar/excluir)

### 13. Página Institucional
- Landing page pública
- Vídeo de fundo e informações da empresa

## Credenciais de Teste
- **Admin:** admin@oficinareis.com / admin123
- **Códigos cadastro:** ADM2024, FUNC2024, MOTORISTA2024

## Status: FUNCIONAL ✅

### Concluído (Sessão 27/02/2026)
- [x] Portal do Cliente com Timeline interativa (6 etapas)
- [x] Busca de OS por CPF/CNPJ
- [x] Dashboard do Motorista com inadimplentes
- [x] Romaneio com fluxo completo (enviando → entregue)
- [x] Checkboxes de confirmação de entrega
- [x] Relatórios com seletor anual
- [x] Gestão de setores na Tabela de Preços
- [x] Dados do cliente no cabeçalho da OS
- [x] Notificações em tempo real no Dashboard

### Backlog Futuro
- [ ] Upload de fotos na OS (Antes/Depois) - apenas ADM
- [ ] Galeria de fotos no Portal do Cliente
- [ ] Melhorar estabilidade do WebSocket em produção
- [ ] Relatório de produtividade por funcionário
- [ ] App mobile para motoristas
