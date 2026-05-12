# Plano de Implementação — Módulo de VOC | Voice of Customer (Revisado)

## 1. Contexto

O módulo de VOC centralizará, estruturará e transformará a voz do cliente em ações concretas. Ele funcionará tanto em modo manual quanto integrado ao RAG + IA, servindo como a camada de validação humana sobre os sinais detectados pela IA.

## 2. Objetivo do Produto

Criar um sistema de inteligência sobre percepção, dores e oportunidades, conectando feedbacks a ações práticas e retroalimentando o RAG com informações confirmadas.

## 3. Estado Atual vs Gap

- **O que já temos**: Dashboard analítico com tendências de sentimento, temas e citações (Quotes).
- **O que falta**: Registro manual de feedbacks, fila de triagem, validação de sugestões da IA e criação de ações (tarefas, riscos) a partir do feedback.

---

## 4. Plano de Implementação em Ondas

### 🌊 Onda 1: Camada de Ação (Operacional)
**Foco**: Permitir o registro e a tratativa de feedbacks.

- **VOC-01: Registro Manual de Feedbacks**
  - Formulário de criação de feedback manual e rápido (US-VOC-001, US-VOC-002).
  - Listagem e detalhe de feedbacks com status de triagem (US-VOC-003, US-VOC-004).
- **VOC-03: Classificação e Triagem**
  - Classificação por tipo, sentimento e criticidade (US-VOC-005 a US-VOC-007).
  - Fila de triagem para feedbacks pendentes (US-VOC-009).
- **VOC-04: Ações a partir do VOC**
  - Criar tarefa, risco ou iniciar playbook a partir de um feedback (US-VOC-010 a US-VOC-013).

### 🌊 Onda 2: Camada de Visão e Priorização de Produto (RICE)
**Foco**: Consolidar os dados, integrar com Produto e priorizar demandas usando o framework RICE da Plannera.

- **VOC-05: Produto e Wishlist**
  - Criar demanda de produto (Wishlist) ou vincular feedbacks a demandas existentes (US-VOC-014, US-VOC-015).
  - **Relacionamento N:N**: Permitir que um mesmo item de Wishlist seja associado a múltiplos clientes/contas. Essa associação alimentará automaticamente o critério de *Alcance* (Reach).
  - **Motor de Priorização RICE Plannera**: Implementar o cálculo automático de score para cada item da Wishlist:
    - **R (Alcance)**: Calculado com base em `% de clientes impactados` (Peso 2) e `% do SOM impactado` (Peso 0.5).
    - **I (Impacto)**: Baseado em Diferencial, Oportunidade Comercial, Compromisso (Peso 100), Satisfação, Evita Churn, Segurança (Peso 50) e Sustentabilidade (Peso 50).
    - **C (Confiança)**: Baseado em aprovações de protótipo, concorrência, pedidos de clientes/leads e detalhamento técnico (Peso 10).
    - **E (Esforço)**: Baseado em dias de dev, barreira técnica, abrangência e risco.
  - Listagem de demandas originadas de VOC para o PM (US-VOC-016), ordenada pelo Score RICE.

- **VOC-07: Analytics e Insights**
  - Dashboard gerencial de VOC (US-VOC-021) expandindo o atual.
  - Consolidação de feedbacks em Insights (US-VOC-023).

### 🌊 Onda 3: Camada de Inteligência (RAG + IA)
**Foco**: Automação na captura e validação de IA.

- **VOC-02: Sugestões RAG + IA**
  - Receber e listar sugestões geradas pela IA (US-VOC-AI-001, US-VOC-AI-002).
  - Interface de revisão: Validar, Editar, Rejeitar, Dividir ou Mesclar sugestões (US-VOC-AI-003 a US-VOC-AI-008).
- **VOC-06: Integrações**
  - Captura automática de comentários de NPS e CSAT (US-VOC-017, US-VOC-018).
  - Alimentar o RAG com feedbacks validados (US-VOC-020).
  - Medição de qualidade das sugestões da IA (US-VOC-022).
