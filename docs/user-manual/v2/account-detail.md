# Manual do Usuário — Detalhe do Cliente (Avaliação 2.0)

Bem-vindo ao manual da tela de **Detalhe do Cliente (Account Detail)**. Esta é a central de comando para gerenciar um cliente específico.

---

## 🎯 O que esta tela faz?

Esta tela reúne todas as informações sobre um cliente: saúde da conta, contratos, linha do tempo de interações, planos de sucesso e tickets de suporte. É aqui que você entende o contexto completo do cliente antes de uma reunião ou ação.

---

## 📊 Regras de Negócio e Memória de Cálculo

### 1. MRR Líquido (No Card de Contrato)
- **O que é**: O valor real que o cliente paga por mês naquele contrato, considerando as regras de governança comercial.
- **Cálculo**: 
    1. Pega o valor base do MRR do contrato.
    2. Aplica as regras de desconto registradas na aba de Governança.
    3. Exibe o valor final líquido.

### 2. T-minus (Dias para Renovação)
- **O que é**: Quantos dias faltam para o contrato vencer.
- **Regra visual**:
    - 🔴 **Menor que 30 dias**: Crítico (Cor Vermelha).
    - 🟡 **Menor que 90 dias**: Atenção (Cor Amarela).
    - 🟢 **Acima de 90 dias**: Seguro (Cor Verde).

### 3. Score de Adoção Real
- **O que é**: Uma nota de 0 a 100 baseada no uso real das funcionalidades pelo cliente.
- **Cálculo**:
    - O sistema avalia quais funcionalidades estão "Em Uso", "Parcial" ou "Bloqueadas".
    - Funcionalidades "Não Aplicáveis" são excluídas do cálculo para não punir a nota do cliente.

---

## 💡 Como Usar a Tela

1. **Linha do Tempo (Cognitive Stream)**: No lado esquerdo, você vê a ordem cronológica de tudo o que aconteceu (interações, e-mails, tickets, mudanças de score).
2. **Success Plan**: No centro, você acompanha as metas estratégicas traçadas com o cliente.
3. **Governança**: No lado direito, você vê os dados do contrato atual e as políticas de SLA.
4. **Assistente IA**: O chat flutuante no canto inferior direito permite fazer perguntas sobre o cliente (ex: "Qual foi o último atrito desse cliente?").

---

## 🎭 Estrutura de Apresentação (Roteiro de Treinamento)

Use este roteiro para apresentar a tela para novos usuários:

*   **Slide 1: Visão 360°** — "Esta é a ficha completa do cliente. O cabeçalho mostra a nota de saúde (Health Score) e o valor do contrato (MRR)."
*   **Slide 2: O que está acontecendo** — "A coluna da esquerda é a nossa Linha do Tempo. Tudo o que qualquer pessoa do time falar com o cliente fica registrado aqui."
*   **Slide 3: Gestão de Contratos** — "Na direita, controlamos a governança e o tempo para a renovação (T-minus). Fiquem de olho nos prazos vermelhos!"

---

## 🗺️ Mapeamento do Ícone de Ajuda (?)

- **Onde incluir**: No cabeçalho da página, ao lado do nome do cliente (na área do `AccountHeader`).
- **Comportamento**: Ao clicar, abrirá este manual em uma nova aba para consulta rápida.
