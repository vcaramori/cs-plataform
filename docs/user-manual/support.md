# Manual do Usuário - Suporte e Chamados

Bem-vindo ao manual do módulo de **Suporte** do CS-Continuum. Esta tela é onde você gerencia todos os incidentes, tickets e o cumprimento de SLA dos seus clientes.

---

## 🎯 Objetivo da Tela
Centralizar o atendimento ao cliente, permitindo triagem rápida, resposta a incidentes e importação automatizada de chamados via Inteligência Artificial.

---

## 📥 Fila Ativa (Listagem de Chamados)

Esta é a aba padrão onde você vê todos os tickets que precisam de atenção.

### Recursos de Busca e Filtro:
- **Filtros Rápidos**: Filtre por Status (Aberto, Em Progresso, Resolvido) e Prioridade (Crítico, Alto, Médio, Baixo).
- **Busca Semântica (IA)**: A barra de pesquisa usa IA! Você pode digitar algo como "cliente reclamando de lentidão" e ela encontrará tickets parecidos, mesmo que não usem as palavras exatas.
- **Filtros Avançados**: Permite criar regras mais complexas e salvá-las como "Views" personalizadas na barra lateral esquerda.

### Ações em Massa:
Você pode marcar as caixas de seleção ao lado dos tickets para:
- Alterar o status de vários ao mesmo tempo.
- Atribuir vários tickets a um CSM específico.
- Fechar chamados em lote.
- Se fizer algo errado, um botão "Desfazer" aparecerá no rodapé por alguns segundos!

---

## ✨ Ingestão Inteligente (Importação)

Esta aba é um recurso avançado que usa o modelo Gemini para criar chamados a partir de arquivos ou textos brutos.

### Formatos Suportados:
1. **Dataset CSV**: Para subir listas estruturadas que você exportou de outro sistema.
2. **Texto Livre**: Você pode colar um e-mail inteiro de um cliente aqui. A IA vai ler, entender o problema, identificar o cliente e criar o ticket!
3. **Escaneamento PDF**: Suba um arquivo PDF (como um relatório ou log). O motor de IA analisará o layout e extrairá os chamados automaticamente.

---

## 📑 Painel de Visualização Rápida (Preview)

Ao clicar em qualquer linha da tabela, uma barra lateral (gaveta) se abrirá na direita.

### O que você encontra lá:
- **Detalhes do Ticket**: Conta vinculada, prioridade, data de abertura e status do SLA.
- **Insights do Guardião IA**: Uma área escura onde a IA explica o motivo daquela urgência (Ex: "O cliente usou palavras fortes como 'urgente' e 'parado'").
- **Ações Rápidas**: Você pode se atribuir ao ticket ("Atribuir a Mim"), mudar o status ou mesclar com outro ticket duplicado.
