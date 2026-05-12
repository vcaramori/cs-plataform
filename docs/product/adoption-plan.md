# Plano de Implementação — Módulo de Adoption Intelligence (Revisado)

## 1. Contexto

O módulo de Adoption Intelligence medirá, diagnosticará e melhorará a adoção dos clientes na plataforma. Ele sairá de uma visão passiva de dados para uma postura ativa de combate a blockers e recuperação de uso.

## 2. Objetivo do Produto

Permitir que o CS entenda a profundidade de uso do cliente, identifique impedimentos (blockers) e execute planos de ação para garantir o valor percebido.

## 3. Estado Atual vs Gap

- **O que já temos**: Heatmap de uso, listagem de blockers e dados de forecast (visualização avançada).
- **O que falta**: Criar/editar blockers manualmente, planos de ação específicos para adoção e sugestões da IA para novos blockers baseados em interações.

---

## 4. Plano de Implementação em Ondas

### 🌊 Onda 1: Camada de Ação (Operacional)
**Foco**: Gestão de impedimentos e planos de recuperação.

- **AD-04: Blockers de Adoção**
  - Registro manual e classificação de blockers (US-AD-011, US-AD-013).
  - Listagem e fluxo de resolução de blockers (US-AD-014, US-AD-015).
- **AD-05: Planos de Ação**
  - Criação e acompanhamento de planos de ação para melhorar a adoção (US-AD-016, US-AD-017).
  - Medição do resultado do plano (Adoption Score antes vs depois) (US-AD-018).

### 🌊 Onda 2: Camada de Visão (Analítica)
**Foco**: Detalhamento e navegação nos dados de uso.

- **AD-03: Heatmap de Adoção**
  - Detalhamento da funcionalidade ao clicar no heatmap (US-AD-008).
  - Marcar funcionalidade como "Não Aplicável" ou "Requer Treinamento" (US-AD-009, US-AD-010).
- **AD-06: Forecast de Adoção**
  - Listagem de clientes com tendência negativa para priorização (US-AD-020).
- **AD-07: Analytics**
  - Análise de adoção por módulo, funcionalidade e usuário (US-AD-022 a US-AD-024).

### 🌊 Onda 3: Camada de Inteligência (RAG + IA)
**Foco**: Automação e diagnósticos inteligentes.

- **AD-04: Blockers de Adoção (IA)**
  - Receber sugestões de blockers identificados pela IA em atas ou tickets (US-AD-012).
- **AD-08: RAG + IA**
  - Geração de resumo inteligente da adoção da conta (US-AD-025).
  - Consulta de dados de adoção por linguagem natural (US-AD-026).
