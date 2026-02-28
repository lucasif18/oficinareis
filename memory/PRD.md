# Oficina Reis - Sistema de Gestão de Retificação de Motores

## Problema Original
Sistema de gestão web completo para oficina de retificação de motores com 8 módulos principais: Dashboard, Clientes, Peças, Ordens de Serviço, Orçamentos, Romaneio, Cadastros e Financeiro. O sistema suporta múltiplos níveis de acesso (ADM, Motorista, Funcionário, Cliente).

## Arquitetura
- **Frontend:** React + TailwindCSS + Shadcn/UI
- **Backend:** FastAPI + Motor (MongoDB async)
- **Database:** MongoDB
- **Auth:** JWT com múltiplos perfis de usuário
- **PDF:** WeasyPrint + QR Code
- **Real-time:** WebSocket
- **Cores:** Azul (#1e3a5f) + Amarelo (#f59e0b)

## Segurança por Perfil
| Funcionalidade | Admin | Motorista | Funcionário | Cliente |
|----------------|-------|-----------|-------------|---------|
| Ver preços/valores | ✅ | ✅ (Contas) | ❌ | ✅ (própria OS) |
| Upload de fotos | ✅ | ❌ | ✅ | ❌ |
| Dashboard financeiro | ✅ | ❌ | ❌ | ❌ |
| Editar/Excluir OS | ✅ | ❌ | ❌ | ❌ |
| Confirmar entrega | ✅ | ✅ | ❌ | ❌ |
| Ver serviços do setor | ✅ | ❌ | ✅ | ❌ |

## Módulos Implementados

### 1. Autenticação e Usuários
- Login JWT com 4 perfis: admin, funcionario, motorista, cliente
- Cadastro público com códigos de validação (ADM2024, FUNC2024, MOTORISTA2024)
- **Redirecionamento por perfil:** Admin→/dashboard, Motorista→/dashboard-motorista, Funcionário→/dashboard-funcionario, Cliente→/dashboard-cliente
- **Sanitização de valores** - funcionários não veem preços (exceto motoristas em Contas a Receber)
- **Recuperação de senha** - Endpoints /api/auth/forgot-password e /api/auth/reset-password

### 2. Dashboards (por perfil)
- **Admin:** Dashboard completo com KPIs, faturamento, notificações em tempo real
- **Funcionário:** Dashboard restrito com serviços disponíveis, em andamento e concluídos
- **Motorista:** Dashboard com romaneios recentes e tabela de inadimplentes com valores
- **Cliente:** Dashboard com estatísticas das OS (total, pendentes, enviando, entregues) e pagamentos pendentes

### 3. Portal do Cliente (/area-cliente) ✨
- Timeline de progresso interativa (6 etapas) com cores amarelas
- Busca por número da OS ou CPF/CNPJ
- **Galeria "Relatório Visual de Qualidade"** (Antes/Depois)
- Atualização em tempo real via WebSocket

### 4. Minhas OS (Cliente Logado) ✨ NOVO
- Dashboard com estatísticas das OS do cliente
- Lista expandível com detalhes de cada OS
- Timeline de progresso em cada OS
- Galeria de fotos Antes/Depois por setor
- Alertas de pagamentos pendentes com dias de vencimento

### 5. Ordens de Serviço ✨ MELHORADO
- **Upload de fotos** (ADM e Funcionário) - Antes/Depois com indicação de setor
- **Botão WhatsApp** para notificar cliente
- **QR Code no PDF** - Link para Portal do Cliente
- **PDF sem fotos** - Apenas dados textuais na impressão
- Dados do cliente no cabeçalho (CPF/CNPJ, telefone, email)
- Status: pendente → andamento → pronto → enviando → entregue

### 6. Serviços do Funcionário ✨ MELHORADO
- Filtro por status (disponível, em andamento, concluído)
- **Filtragem automática por setor** - Funcionário só vê serviços dos seus setores (especialidades)
- **Upload de fotos Antes/Depois** com notificação para cliente e ADM
- Quando funcionário pega um serviço, aparece automaticamente na OS para ADM e Motorista
- Atualização em tempo real via WebSocket

### 7. Notificações WhatsApp
- Link gerado automaticamente com mensagem formatada
- Mensagem inclui: nome do cliente, número da OS, status atual, link do portal
- ADM/Motorista podem enviar com 1 clique

### 8. Romaneio (Entregas)
- Filtra apenas OS com status "pronto"
- Ao criar romaneio, OS muda para "enviando"
- Checkboxes de confirmação de entrega por item
- Ao confirmar, OS muda para "entregue"

### 9. Financeiro
- Contas a Pagar/Receber
- **Motorista pode ver valores** em Contas a Receber
- Fluxo de Caixa
- DRE (Demonstração do Resultado)
- Lista de inadimplentes (débitos > 30 dias)

### 10. Funcionários
- Auto-cadastro cria registro na lista de funcionários
- ADM pode selecionar setores (especialidades) de cada funcionário
- Especialidades disponíveis: Virabrequim, Bloco, Bielas, Cabeçote, Comando, Válvulas, Gerais

### 11. Relatórios
- Seletor de período anual
- Resumo anual completo
- Gráficos de faturamento mensal

### 12. Tabela de Preços
- CRUD de serviços por setor
- Gestão de setores (criar/editar/excluir)

## Credenciais de Teste
- **Admin:** admin@oficinareis.com / admin123
- **Motorista:** motorista@oficinareis.com / motorista123
- **Funcionário:** funcionario@oficinareis.com / func123
- **Códigos cadastro:** ADM2024, FUNC2024, MOTORISTA2024

## Status: FUNCIONAL ✅

### Concluído (Sessão 28/02/2026)
- [x] Redirecionamento de login por perfil corrigido
- [x] Dashboard do Cliente (DashboardCliente.js) com estatísticas e pagamentos pendentes
- [x] Página Minhas OS (MinhasOS.js) para cliente visualizar detalhes
- [x] Menu lateral correto para cada perfil
- [x] Upload de fotos pelo funcionário com notificação
- [x] Filtragem de serviços por setor do funcionário
- [x] Motorista pode ver valores em Contas a Receber
- [x] QR Code no PDF da OS
- [x] PDF sem fotos (apenas dados textuais)

### Backlog Futuro
- [ ] Integração direta com API WhatsApp Business
- [ ] Notificações push automáticas para cliente quando foto é enviada
- [ ] Relatório de produtividade por funcionário
- [ ] App mobile para motoristas
