# Manual do Usuário — Dashboard (Avaliação 2.0)

Bem-vindo ao manual do **Dashboard (Portfolio Control)**. Esta tela foi desenhada para oferecer uma visão executiva e em tempo real da saúde da sua carteira de clientes e da receita recorrente.

---

## 🎯 O que esta tela faz?

O Dashboard é o ponto de partida do seu dia. Ele consolida os principais indicadores de sucesso (KPIs) e lista todos os seus clientes (LOGOS) com seus respectivos status de saúde e financeiros.

---

## 📊 Regras de Negócio e Memória de Cálculo

Para garantir a transparência ("Zero Mediocridade"), aqui estão as regras de como os números são gerados:

### 1. MRR Total (Receita Recorrente Mensal)
- **O que é**: A soma da receita que entra todo mês através dos contratos ativos.
- **Cálculo**: 
    1. O sistema busca todos os contratos com status **"Ativo"**.
    2. Soma o valor do MRR de cada um.
    3. Se houver desconto aplicado no contrato, o cálculo considera o valor líquido.

### 2. Health Score (Saúde do Cliente)
- **O que é**: Uma nota de 0 a 100 que indica a probabilidade do cliente continuar com a Plannera.
- **Regra visual**:
    - 🟢 **70 a 100**: Cliente Saudável.
    - 🟡 **40 a 69**: Atenção necessária.
    - 🔴 **0 a 39**: Alto risco de cancelamento (Churn).

### 3. Clientes em Risco
- **O que é**: Quantidade de clientes que precisam de ação imediata.
- **Regra**: Um cliente entra nesta contagem se:
    - O seu Health Score for menor que 40.
    - **OU** Se a Inteligência Artificial detectar um risco alto (Score de Risco AI ≥ 80) ou sentimento negativo nas interações.

---

## 💡 Como Usar a Tela

1. **Filtros Rápidos**: Use os botões no topo da tabela para filtrar clientes por segmento (Indústria, MRO, Varejo).
2. **Busca**: Digite o nome do cliente na barra de busca para encontrá-lo rapidamente.
3. **Acesso ao Detalhe**: Clique em qualquer linha da tabela para abrir a página de detalhes daquele cliente específico.

---

## 🎭 Estrutura de Apresentação (Roteiro de Treinamento)

Use este roteiro para apresentar a tela para novos usuários ou em reuniões de alinhamento:

*   **Slide 1: Visão Geral** — "Este é o nosso painel de controle. Aqui vemos quantos clientes temos e quanto dinheiro (MRR) estamos gerindo."
*   **Slide 2: Gestão de Risco** — "Atenção aos cards vermelhos. Se o Health Score cair ou a IA apitar, o cliente aparece aqui como 'Em Risco'."
*   **Slide 3: Ação** — "A tabela abaixo permite buscar e filtrar. Ao clicar em um cliente, você vai para a próxima camada de detalhe."

---

## 🗺️ Mapeamento do Ícone de Ajuda (?)

- **Onde incluir**: No canto superior direito do `ModuleHeader`, ao lado do título "Portfolio Control".
- **Comportamento**: Ao clicar, abrirá este manual em uma nova aba para consulta rápida do usuário.
