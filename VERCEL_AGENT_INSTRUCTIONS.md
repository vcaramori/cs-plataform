# Instruções do Vercel CLI para Agentes de IA (Claude/Cursor)

## Contexto e Autenticação
Este ambiente local (onde o terminal está sendo executado) já está **autenticado** e **vinculado** ao projeto Vercel correto. 
- **Usuário Vercel:** `vcaramori`
- **Projeto Vinculado:** `cs-plataform`
- **Ferramenta de Acesso:** Vercel CLI (comando `vercel`)

**Aviso para a IA:** Você não precisa configurar nenhum token de API REST ou rodar o comando de login. Você já possui permissão de leitura e escrita. Basta executar os comandos da CLI diretamente via terminal na raiz do projeto.

---

## Comandos Úteis e Modo Não-Interativo

Como agentes de IA operam através de scripts e terminais sem interface humana (TTY), é fundamental rodar os comandos de forma que não travem esperando confirmações do usuário. Siga estes padrões:

### 1. Listar Variáveis
Lista todas as variáveis de ambiente cadastradas no Vercel (para ver quais já existem).
```bash
vercel env ls
```

### 2. Adicionar Variável (Não-Interativo)
Para adicionar uma variável sem travar o terminal, você deve repassar o valor via `echo` (pipeline) e especificar os ambientes.
```bash
echo -n "VALOR_DA_VARIAVEL" | vercel env add NOME_DA_VARIAVEL production preview
```
*(No Windows PowerShell, o equivalente seguro pode ser: `Write-Output "VALOR" | vercel env add NOME_DA_VARIAVEL production preview`)*

### 3. Remover Variável (Não-Interativo)
Para apagar uma variável, obrigatoriamente use a flag `-y` (yes) para pular a tela de confirmação.
```bash
vercel env rm NOME_DA_VARIAVEL production preview -y
```

### 4. Atualizar uma Variável Existente
A CLI do Vercel não possui um comando "update". Para alterar o valor de uma variável que já existe, você deve primeiro removê-la e, em seguida, adicioná-la com o novo valor:
```bash
vercel env rm NOME_DA_VARIAVEL production preview -y
echo -n "NOVO_VALOR" | vercel env add NOME_DA_VARIAVEL production preview
```

### 5. Baixar as Variáveis para Uso Local
Se você precisar baixar as configurações mais recentes do Vercel para rodar o projeto localmente (`npm run dev`):
```bash
vercel env pull .env.local
```

### 6. Disparar um Deploy (Opcional)
Se precisar enviar o código atual para produção diretamente pelo terminal:
```bash
vercel --prod
```
