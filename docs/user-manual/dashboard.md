# Manual do Usuário - Dashboard (Portfolio Control)

Bem-vindo ao manual do **Dashboard** do CS-Continuum. Esta tela é a sua central de comando executiva, onde você pode acompanhar a saúde financeira e operacional de toda a base de clientes (Logos).

---

## 🎯 Objetivo da Tela
O Dashboard oferece uma visão macro e consolidada do portfólio de clientes da Plannera, permitindo identificar rapidamente faturamento (MRR), clientes em risco e índices de satisfação (NPS).

---

## 📊 Entendendo os Indicadores (KPIs)

No topo da tela, você verá 6 cartões de indicadores. Veja o que cada um significa e como é calculado:

### 1. Total de Logos
- **O que é**: Quantidade total de clientes cadastrados no sistema.
- **Subtexto**: Mostra o número de contratos ativos vinculados a essas contas.

### 2. MRR Total
- **O que é**: Receita Recorrente Mensal (Monthly Recurring Revenue) somada de todos os clientes.
- **Memória de Cálculo**: 
  - O sistema busca todos os contratos com status `Ativo`.
  - Soma o valor base do MRR de cada contrato.
  - **Atenção**: O cálculo já considera o desconto comercial aplicado em cada contrato (MRR Base * (1 - % Desconto)).
- **Visualização**: Se o valor passar de 1 Milhão, ele será exibido de forma resumida (Ex: `1.500 Mi`).

### 3. Health Médio
- **O que é**: A nota média de saúde (Health Score) de toda a sua base de clientes.
- **Memória de Cálculo**: Soma das notas de saúde de todos os clientes dividida pelo número total de clientes.
- **Cores**:
  - 🟢 **Verde** (70 a 100): Portfólio saudável.
  - 🟠 **Laranja** (40 a 69): Atenção necessária.
  - 🔴 **Vermelho** (0 a 39): Alto risco.

### 4. Logos em Risco
- **O que é**: Quantidade de clientes que precisam de atenção imediata.
- **Critério de Risco**: Um cliente entra nesta contagem se:
  - O Health Score dele for menor que 40.
  - **OU** Se a Inteligência Artificial (Análise de Sentimento) detectar um risco alto (Score >= 80 ou sentimento negativo nas interações).

### 5. Renovações (30D)
- **O que é**: Quantidade de contratos que vencem ou precisam ser renovados nos próximos 30 dias.

### 6. NPS Score
- **O que é**: Net Promoter Score do portfólio (Índice de Satisfação).
- **Cálculo**: (% de Clientes Promotores - % de Clientes Detratores).

---

## 🔎 Como Usar a Tabela de Clientes

Abaixo dos indicadores, você encontra a lista completa de clientes.

### Recursos Disponíveis:
- **Busca**: Use a barra de pesquisa para encontrar um cliente pelo nome.
- **Filtros de Segmento**: Clique nos botões (Tudo, Indústria, MRO, Varejo) para filtrar a lista rapidamente.
- **Alerta de IA (`AI Risk`)**: Se vir um selo vermelho escrito "AI Risk" ao lado do nome do cliente, significa que a IA leu as últimas interações e detectou insatisfação.
- **Navegação**: Clique em qualquer linha da tabela para abrir a página de detalhes daquele cliente específico.
- **Edição Rápida**: Ao passar o mouse sobre a nota de Saúde (Health), um ícone de lápis aparecerá para que você possa editar a nota rapidamente se necessário.
