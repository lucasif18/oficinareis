# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"

#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "Sistema de gestão Oficina Reis com módulo Financeiro completo: Fluxo de Caixa, Contas a Pagar, Contas a Receber (vinculado a OS concluídas) e DRE"

backend:
  - task: "API Contas a Pagar CRUD"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoints implementados para CRUD de contas a pagar"

  - task: "API Contas a Receber CRUD"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoints implementados para CRUD de contas a receber"

  - task: "API Fluxo de Caixa"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoint GET para buscar fluxo de caixa"

  - task: "API DRE"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoint GET para buscar DRE por mês/ano"

frontend:
  - task: "Página Contas a Pagar"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/ContasPagar.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Página com CRUD completo e filtros"

  - task: "Página Contas a Receber"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/ContasReceber.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Página com CRUD completo, vinculo a OS e importação de OS concluídas"

  - task: "Página Fluxo de Caixa"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/FluxoCaixa.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Página com visualização de entradas/saídas e filtro por período"

  - task: "Página DRE"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/DRE.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Página com demonstração de resultado detalhada e navegação por mês"

  - task: "Rotas do módulo Financeiro"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/App.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Rotas adicionadas para fluxo-caixa, contas-pagar, contas-receber e dre"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 1
  run_ui: true

test_plan:
  current_focus:
    - "Página Contas a Receber"
    - "Página Fluxo de Caixa"
    - "Página DRE"
    - "Navegação do módulo Financeiro"
  stuck_tasks: []

# Incorporate User Feedback:
# - Contas a Receber deve mostrar OS concluídas disponíveis para cobrança
# - Navegação pelos botões na página /financeiro deve funcionar
# - Filtros e funcionalidades CRUD devem funcionar corretamente
