# Plano de Implementação — Módulo de Playbooks CS (Revisado)

## 1. Contexto

O módulo de Playbooks evoluirá de um simples construtor visual para o **sistema operacional de execução de Customer Success** da Plannera. Ele permitirá padronizar, acompanhar e executar jornadas de atendimento ao cliente, integrando-se com o sistema de RAG + IA.

## 2. Objetivo do Produto

Permitir que o time de CS crie, publique, execute e acompanhe fluxos padronizados de atuação por cliente, com etapas, tarefas, responsáveis e prazos, garantindo rastreabilidade e métricas de efetividade.

## 3. Estado Atual vs Gap

- **O que já temos**: Listagem de templates e Builder visual (ReactFlow) em `/playbooks/builder`. Estrutura de banco inicial.
- **O que falta**: Execução real por cliente (página de detalhe), central de tarefas do CSM, controle de evidências e integração com RAG para sugestões.

---

## 4. Plano de Implementação em Ondas

Conforme alinhado, o desenvolvimento será dividido em ondas, priorizando a camada de ação e operação.

### 🌊 Onda 1: Camada de Ação (Operacional)
**Foco**: Tornar o playbook executável e rastreável.

- **PB-01: Gestão de Templates**
  - CRUD completo de templates (US-PB-001 a US-PB-005).
  - Controle de ciclo de vida (Rascunho, Ativo, Pausado).
- **PB-02: Estrutura do Playbook**
  - Criação de etapas e tarefas com prazos relativos (US-PB-006 a US-PB-010).
  - Configuração de responsáveis por papel (CSM, Gestor).
- **PB-03: Execução por Cliente**
  - Iniciar playbook manualmente para uma conta (US-PB-011).
  - Tela de detalhe da execução (US-PB-013) com timeline de tarefas.
  - Atualização de status de tarefas e encerramento com resultado (US-PB-014, US-PB-015).

### 🌊 Onda 2: Camada de Visão (Analítica)
**Foco**: Dar visibilidade ao gestor e ao CSM sobre a operação.

- **PB-04: Central de Execuções e Tarefas**
  - Tela de listagem de todas as execuções (US-PB-016).
  - Central de tarefas consolidada para o CSM (US-PB-017).
  - Alertas visuais de playbooks atrasados (US-PB-018).
- **PB-06: Métricas**
  - Dashboard de playbooks (US-PB-024) com taxa de conclusão e tempo médio.
  - Medição de sucesso por template (US-PB-025).

### 🌊 Onda 3: Camada de Inteligência (RAG + IA)
**Foco**: Automação e sugestões inteligentes.

- **PB-05: RAG + IA e Gatilhos Inteligentes**
  - Receber sugestão de playbook da IA com base em sinais do RAG (US-PB-019).
  - Iniciar playbook a partir da sugestão validada (US-PB-020).
  - Configuração de regras automáticas e simulação de impacto (US-PB-021, US-PB-022).
  - Prevenção de duplicidade (US-PB-023).

---

## 5. Estrutura de Dados (Proposta)

Para suportar a integração com o RAG na Onda 3, propomos uma tabela de **Eventos Operacionais** que registrará toda ação humana (validação, conclusão) para retroalimentar o modelo.

- `playbook_templates` (Existente, precisa de versão/status)
- `playbook_tasks` (Existente)
- `account_playbooks` (Existente, precisa de status da execução)
- `account_playbook_tasks` (Existente, precisa de evidências e comentários)
- `operational_events` (Nova: logs de ações para o RAG)
