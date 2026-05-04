# Definition of Done — CS-Continuum

**Versão:** 1.0 | **Autor:** Murat (Master Test Architect)

Toda feature não é considerada **done** até passar neste checklist completo. Não é sugestão — é gate obrigatório.

---

## Camada 1: Código

- [ ] **TypeScript strict:** `tsc --noEmit` passa sem erros
- [ ] **Zero `any` implícito:** Se houver `any` necessário, comentário com justificativa está no código
- [ ] **Sem console.log, debugger ou código de teste deixado:** Somente logs de erro com contexto
- [ ] **Variáveis de ambiente novas:** Listadas em `.env.example` com descrição
- [ ] **Imports organizados:** Sem dead imports, nenhum circular dependency
- [ ] **Nenhum arquivo novo sem cabeçalho de copyright/licença (se aplicável)**

---

## Camada 2: Testes

### Obrigatório para TODAS as features

- [ ] **Playwright E2E — Happy path:** O fluxo principal da feature funciona do início ao fim
- [ ] **Playwright E2E — Empty/error state:** Comportamento correto quando não há dados ou API retorna erro
- [ ] **Isolamento de tenant:** Explicitamente testado — dados do tenant A não aparecem para tenant B
- [ ] **Nenhum teste existente quebrado:** `npm run test:e2e` passa com 100% de sucesso
- [ ] **Fixtures de teste:** Dados de teste bem definidos em `playwright.config.ts` ou arquivo compartilhado

### Adicional para Features de IA

- [ ] **Dataset de 20 fixtures:** Exemplos com input + output esperado
- [ ] **Taxa de acerto documentada:** "Feature X alcança 87% de acerto no dataset de fixture"
- [ ] **Regressão testada:** Mudança de prompt? Rodar fixtures novamente antes do merge
- [ ] **Fallback definido e testado:** Se LLM falha, o sistema não quebra

### Adicional para Regras de Negócio

- [ ] **Pelo menos 2 edge cases testados explicitamente** (não apenas happy path):
  - Exemplo: reopen automático com reply de agente não reabre (RA7)
  - Exemplo: merge de ticket com SLA em breach preserva estado da timeline (M7)
- [ ] **Idempotência testada:** Executar a mesma regra 2x = mesmo resultado
- [ ] **Concorrência testada:** Dois eventos simultâneos resultam em estado consistente (não race condition)

### Adicional para Bulk Actions

- [ ] **Atomicidade ou relatório claro:** Falha no item K significa: tudo reverte (ideal) OU relatório exato de quais K-1 foram aplicados
- [ ] **Testado com > 100 itens:** Performance e correção com volume alto
- [ ] **Edge case: 0 itens selecionados:** UI desabilita botão ou toast claro

### Adicional para Integrações

- [ ] **Idempotência com mesmo ID:** Replay automático não cria duplicatas
- [ ] **Rate limiting:** Testado com hammering (10+ req/s), sem comportamento inesperado
- [ ] **Payload malformado:** 400 com mensagem clara (nunca 500 ou silent failure)

---

## Camada 3: Segurança

- [ ] **RLS verificado:** Toda nova query toca Supabase RLS e está testada com dois usuários diferentes
- [ ] **Tenant isolation:** Testado explicitamente — Tenant A não acessa dados de Tenant B
- [ ] **Inputs sanitizados:** Especialmente inputs que vão para LLM (sem PII vazando, sem SQL injection aparente)
- [ ] **Feature flag presente:** Features de IA e integrações têm `FEATURE_FLAG_[name]` no `.env`
- [ ] **Nenhuma credencial em código:** Secrets vêm de `.env`, nunca hardcoded ou em comments
- [ ] **Headers de segurança:** Endpoints internos verificam `x-api-secret` ou JWT válido

---

## Camada 4: Observabilidade

- [ ] **Erros logados com contexto:** Não só "Error: failed", mas contexto do que estava acontecendo
- [ ] **Trace IDs em chamadas LLM:** Toda chamada ao Gemini/API tem trace_id para debug
- [ ] **Feature flags logadas:** Quando uma feature é ativada/desativada, há log
- [ ] **Latência observável:** Features críticas têm métrica de tempo (via logs ou monitoring)
- [ ] **Zero erros silenciosos:** Falha de API, webhook, ou job sempre aparece em log

---

## Camada 5: UX

- [ ] **Loading state presente:** Nenhuma operação assíncrona deixa a UI congelada sem feedback
- [ ] **Empty state descritivo:** Tela vazia explica por quê (não resultado vazio, não erro)
  - Exemplo ruim: "Nenhum resultado" (por quê?)
  - Exemplo bom: "Nenhum ticket encontrado. Tente ampliar os filtros ou criar um novo."
- [ ] **Mensagens de erro úteis:** Erro de API não exibe stack trace — exibe ação clara para o usuário
  - Exemplo ruim: "TypeError: Cannot read property 'data' of undefined"
  - Exemplo bom: "Falha ao carregar tickets. Verifique sua conexão e tente novamente."
- [ ] **Ação destrutiva tem confirmação:** Deletar, fechar em massa, merge, etc. Nunca executam sem `onConfirm` explícito
- [ ] **Feedback de sucesso:** Operação executada → toast/notification claro ("5 tickets fechados")
- [ ] **Comportamento de validação claro:** Campos inválidos destacados, mensagem inline explicando por quê

---

## Camada 6: Performance

- [ ] **LCP < 2s para listas com 500+ registros:** Otimização de query ou virtualization se preciso
- [ ] **Mudança de filtro < 800ms:** Resposta rápida ao usuário
- [ ] **Zero layout shift:** Loading states não causam reflow (use skeleton, não spinner flutuante)
- [ ] **Debouncing em inputs:** Busca semântica, filtros dinâmicos tem debounce (não request a cada keystroke)

---

## Camada 7: Documentação

- [ ] **README.md atualizado:** Se a feature muda setup, variáveis de ambiente ou fluxo principal
  - Incluir: o que mudou, por quê, como usar
- [ ] **docs/product/ atualizado:** Arquivo correspondente reflete o novo comportamento
  - Exemplo: `docs/product/04-suporte.md` ganhou seção de "Merge de Tickets"
- [ ] **Critérios de aceite marcados:** Cada AC do card revisado manualmente (não apenas "implementado")
- [ ] **Comentário em código apenas para "por quê":** Código bem nomeado fala o "o quê" — comentário explica "por quê"
  - Ruim: `// Atualizar ticket` (óbvio no código)
  - Bom: `// Merge força reinício do SLA clock para evitar créditos duplicados` (não-óbvio, documentado)

---

## Camada 8: Revisão Final (Self-Review do Dev)

Antes de fechar a sessão:

- [ ] **Diff review:** Ler o diff completo uma vez — há algo que não deveria estar?
- [ ] **Sem TODOs críticos:** Se há `// TODO: refactor later`, marcar como técnica debt (issue separada) e registrar em docs/product/
- [ ] **Nenhuma feature flag com valor hardcoded:** Feature flags sempre vêm de `.env`
- [ ] **Tests rodam em CI:** Sem flakiness, sem timeout, 100% green
- [ ] **Sem regressões visuais:** Se tocou UI, verificar em light mode + dark mode (se aplicável)

---

## Padrão por Tipo de Feature

### Lista / Filtro (Views Salvas, Filtros Compostos, Bulk Actions)

**Além do DoD geral:**
- [ ] F7: Bulk action é atômica (tudo ou nada, sem estado inconsistente)
- [ ] F8: Ordenação composta é estável (sem shuffle entre renders)
- [ ] F9: URL reflete estado de filtro (deep link funciona)
- [ ] R1: View salva de outro usuário não aparece na lista
- [ ] R3: Bulk action não toca registros fora do escopo ativo
- [ ] Limite de resultados: máximo de 100 na lista (pagination se preciso)
- [ ] Filtros compostos: AND é padrão, OR é opt-in

### Regra de Negócio (Reopen Automático, Auto-close, Merge)

**Além do DoD geral:**
- [ ] F3: Regra é idempotente (2x = mesmo resultado final)
- [ ] F4: Auditoria completa (log de cada disparo com timestamp, user, motivo)
- [ ] F5: Estado final correto na UI sem reload manual
- [ ] E1: Já no estado destino = no-op (sem erro, sem log duplicado)
- [ ] E2: Recurso deletado antes do disparo = fail graciosamente
- [ ] E3: Disparo concorrente = estado consistente
- [ ] SLA clock explicitamente testado (reinicia ou continua conforme regra)
- [ ] Notificações geradas corretas em conteúdo e destinatário

### Feature de IA (Categorização, Sentiment, Duplicata, "O que responder?")

**Além do DoD geral:**
- [ ] F1: Output exibido como "sugestão" (nunca oficial confirmado)
- [ ] F2: CSM pode rejeitar sem side-effects
- [ ] F3-F4: Fallback definido para erro 500 e parse error
- [ ] F6: Latência p95 < [N]s (definir por feature)
- [ ] Q1: Taxa de acerto >= [X]% no dataset (threshold min documentado)
- [ ] Q3: Output nunca expõe dados de outros clientes
- [ ] O1: Trace ID logado em toda chamada
- [ ] O2: Erros logados com input (sanitizado)
- [ ] O3: Feature flag permite desabilitar sem redeploy
- [ ] Rg1-Rg2: Dataset de 20 fixtures no CI, regressão detecta degradação de acerto

### Integração (Webhook, Formulário Público)

**Além do DoD geral:**
- [ ] F1: Payload válido processa em < [N]s
- [ ] F2: Payload inválido retorna 400 com mensagem (nunca 500)
- [ ] F3: Campo extra é aceito (forward-compatible)
- [ ] F5: Replay de mesmo payload é idempotente
- [ ] S1: Erros não expõem infra details
- [ ] S3: Rate limit testado (X req/min/origem)
- [ ] O1: Log de todo webhook recebido
- [ ] O2: Falhas de processamento geram alerta (não silenciam)

---

## Exceções Documentadas

**Somente** se documentado no card + aprovado por Vinicius:

- [ ] Feature flag desabilitada provisoriamente (máx 7 dias)
- [ ] Tech debt acumulado (link para issue, data de resolução)
- [ ] E2E teste postponido (máx próxima sessão BMAD)
- [ ] Performance optimization postponida (máx F2 se feature é crítica para F1)

---

## Sintaxe de Checklist no Card

Ao criar um card, use esse template no final:

```markdown
## Definition of Done

- [ ] Código: TypeScript strict, zero `any`, sem console.log
- [ ] Testes: E2E (happy + empty), isolamento tenant testado, fixtures presentes
- [ ] Segurança: RLS verificado, tenant isolation, inputs sanitizados, feature flag
- [ ] Observabilidade: Erros com contexto, trace IDs (se LLM), zero silenciosos
- [ ] UX: Loading states, empty states, confirmação em destrutivas, mensagens úteis
- [ ] Performance: [específico para feature]
- [ ] Documentação: README.md atualizado, docs/product/ atualizado, ACs verificados
- [ ] Self-review: Diff, sem TODOs críticos, CI verde, sem regressões visuais

**Padrão adicional:** [Link para template de feature do tipo X]
```

---

## Perguntas Frequentes

**P: Se uma feature E2E testa happy path, preciso testar todos os edge cases?**  
R: Não todos. Mínimo 2 edge cases obrigatórios no E2E. Edge cases de "segurança" (isolamento tenant) sempre testados.

**P: Feature que não modifica data (só UI) precisa de teste?**  
R: Sim. UI que não testa é regressão silenciosa. Playwright E2E mínimo de happy path.

**P: Feature flag pode ficar desabilitada permanentemente?**  
R: Não. Será clean up em sessão separada. Máx 7 dias.

**P: Quantas features cabem em uma sessão BMAD?**  
R: Depende da complexidade. P = 2-3 features. M = 1 feature. G = 1 feature.
