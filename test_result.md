# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS

user_problem_statement: "Implementar edição e exclusão de OS, atualizar moldes de impressão PDF, criar página institucional com vídeos e história da empresa"

backend:
  - task: "PUT /api/ordens-servico/{id} - Editar OS"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoint para atualizar dados completos da OS"

  - task: "DELETE /api/ordens-servico/{id} - Excluir OS"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Endpoint para excluir OS e restaurar estoque de peças"

  - task: "PDF de OS atualizado"
    implemented: true
    working: "NA"
    file: "/app/backend/server.py"
    stuck_count: 0
    priority: "medium"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Template de PDF profissional otimizado para impressão A4"

frontend:
  - task: "Página de Edição de OS"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/EditarOS.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Formulário completo para edição de OS existente"

  - task: "Botões Editar/Excluir na lista de OS"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/OrdensServico.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Botões de ação com restrições por role"

  - task: "Página Institucional"
    implemented: true
    working: "NA"
    file: "/app/frontend/src/pages/Institucional.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Página completa com vídeo de fundo, história, serviços e contato WhatsApp"

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 3
  run_ui: true

test_plan:
  current_focus:
    - "Página institucional carrega com vídeo"
    - "Botões editar e excluir na lista de OS"
    - "Navegação para página de edição"
  stuck_tasks: []
