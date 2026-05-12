# Plano de Implementação — Módulo de CS Ops (Revisado)

## 1. Contexto

O módulo de CS Ops consolidará a visão operacional, gerencial e executiva da área de CS. Ele consumirá informações dos demais módulos e do RAG + IA para garantir que o time atue nos clientes certos com a cadência certa.

## 2. Objetivo do Produto

Permitir que a liderança acompanhe a saúde da operação, a carga de trabalho do time, a cobertura da carteira e a execução das estratégias de CS.

## 3. Estado Atual vs Gap

- **O que já temos**: Visão de capacidade (Workload) por CSM e sugestões de rebalanceamento.
- **O que falta**: Cockpit de Atenção Necessária, monitoramento de cadência de reuniões, central de tarefas/riscos unificada e alertas gerenciais.

---

## 4. Plano de Implementação em Ondas

Conforme solicitado, iniciaremos expandindo a camada de Capacidade e Performance para depois construir o Cockpit Gerencial.

### 🌊 Onda 1: Camada de Capacidade e Performance
**Foco**: Gestão de carga do time e registro de atividades.

- **CSO-07: Capacidade e Performance**
  - Cálculo de carga operacional por CSM (US-CSO-024).
  - Visualização de performance operacional e indicadores de resultado (US-CSO-025, US-CSO-026).
- **CSO-02: Time e Carteira**
  - Detalhe individual do CSM e comparação entre membros do time (US-CSO-004, US-CSO-005).
- **CSO-03: Atividades do Time**
  - Registro manual de atividades de CS (Reuniões, e-mails, check-ins) (US-CSO-009).

### 🌊 Onda 2: Camada de Cockpit Operacional
**Foco**: Centralização de pendências e priorização.

- **CSO-01: Cockpit Gerencial**
  - Tela inicial consolidada de CS Ops (US-CSO-001).
  - Bloco de "Atenção Necessária" (US-CSO-002) - a "Fila de Trabalho" do gestor.
- **CSO-04: Tarefas e Pendências**
  - Centralização de tarefas de todas as origens (Playbooks, VOC, NPS) (US-CSO-013).
  - Fluxo de reatribuição de tarefas (US-CSO-014).
- **CSO-06: Riscos e Planos de Ação**
  - Consolidação de riscos da base e exigência de planos para riscos críticos (US-CSO-020, US-CSO-022).

### 🌊 Onda 3: Camada de Cadência e Inteligência (RAG)
**Foco**: Governança de contatos e automação.

- **CSO-05: Cadência e Reuniões**
  - Configuração de regras de cadência e monitoramento de cobertura (US-CSO-016, US-CSO-017).
  - Acompanhamento e medição de qualidade das reuniões (US-CSO-018, US-CSO-019).
- **CSO-08: Smart Alerts, IA e RAG**
  - Atividades e Riscos detectados automaticamente pelo RAG + IA (US-CSO-010, US-CSO-021).
  - Geração de alertas gerenciais e resumo semanal (US-CSO-027, US-CSO-028).
  - Consulta da operação por linguagem natural (US-CSO-029).
