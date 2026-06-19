# 6. Esforço — Registro de Tempo

## Visão Geral do Módulo

O **Esforço** permite aos CSMs registrarem o tempo gasto em atividades de Customer Success. O sistema oferece extração automática de informações via NLP com fallback manual.

**Caminho:** `/esforco`

## Data do evento + tag de onboarding + vetorização no RAG (2026-06-09)

Para permitir **carga de contexto histórico** (interações antigas) e melhorar o RAG, o lançamento de esforço ganhou:
- **Data do evento (opcional)** — vazia = hoje/IA; **preenchida = data real** em que ocorreu. Vai no `time_entries.date`, na `interaction` criada e no texto vetorizado (não usa a data do upload). Campo em [EsforcoKPIs.tsx](../../src/app/(dashboard)/esforco/components/EsforcoKPIs.tsx); tratado em [api/time-entries/route.ts](../../src/app/api/time-entries/route.ts) (`date` → `effectiveDate`).
- **Toggle "É ação de onboarding?"** — apenas **classifica** o registro como onboarding (`activity_type='onboarding'` + rótulo `[ONBOARDING]` no RAG). **Não** dispara o projeto de onboarding (templates/marcos/Gantt). Para implantações em andamento, use o projeto de onboarding na conta.
- **Vetorização no RAG** — quando o esforço gera uma `interaction` (reunião/onboarding/qbr ou risco/positivo), ela passa a ser **indexada** (`storeEmbeddings`, `source_type='interaction'`) com a **data embutida no `chunk_text`** → busca semântica com contexto temporal correto. Antes só alimentava o "Journal de Esforço".

> Carga histórica = exceção; o uso normal (sem data) segue idêntico.

---

## Read.ai — reuniões viram esforço automaticamente (2026-06-18)

As reuniões gravadas no **Read.ai** entram **automaticamente** na plataforma. Há **dois caminhos** (ambos sem token hardcoded, ambos alimentam esforço + timeline + RAG e deduplicam pela mesma reunião):

- **Webhooks (recomendado):** um admin configura **uma vez** um webhook de **workspace** em `app.read.ai/analytics/integrations/webhooks` apontando para a URL da plataforma (copiável no admin) e cola a *signing key*. O Read.ai **empurra** cada reunião assim que o relatório fica pronto — sem login por CSM, sem token expirando. O CSM dono é resolvido pelo **e-mail do owner** da reunião (com CSM padrão de fallback).
- **OAuth (opcional):** cada CSM conecta o próprio Read.ai **uma vez** (card "Read.ai" na home → **Conectar** → login no navegador) e o job horário puxa suas reuniões — **passadas e novas** — para o backfill do histórico.

Cada reunião importada gera, de forma idempotente (dedup pela reunião):

- **Esforço** (`time_entries`, `activity_type='meeting'`, horas = **duração da reunião**, data = data da reunião) — conta para o esforço/custo do CSM como qualquer lançamento.
- **Interação** na timeline da conta com a **transcrição completa** (`interactions.raw_transcript`) + resumo.
- **Vetorização no RAG** (`storeEmbeddings('interaction', …)`, resumo + transcrição) → as reuniões ficam pesquisáveis no Perguntar/360°.
- **Tarefas** a partir dos *action items* da reunião (`csm_tasks`).

**Importação confiável (log + histórico + merge):** conectar o Read.ai dispara o **backfill completo** do próprio CSM na hora (card "Importar minhas reuniões"); o incremento segue pelo cron horário. Toda reunião é registrada em **`readai_import_log`** e exposta no admin (card **"Histórico de importações"**: nova/mesclada/atualizada/pulada/erro/possível-duplicata + motivo). Botão **"Forçar histórico completo"** reimporta tudo. **Anti-duplicação**: se a reunião já foi lançada como esforço manual no mesmo dia/conta, ela **enriquece** esse esforço (transcrição/resumo/participantes) **preservando as horas lançadas à mão** — não duplica; ambíguo vira "possível duplicata" para revisão.

**Webhook (PUSH):** o Read.ai assina cada entrega com **HMAC-SHA256** (`X-Read-Signature`); a plataforma verifica contra a *signing key* (base64) salva no admin. O payload (`session_id`, `transcript.speaker_blocks`, `action_items`, `owner`, participantes…) é mapeado para a mesma ingestão do OAuth. Re-entregas (retry do Read.ai) só atualizam a mesma reunião. Rota [api/integrations/readai/webhook](../../src/app/api/integrations/readai/webhook/route.ts) + lib `webhook.ts`.

**OAuth (PULL):** o Read.ai não tem token estático — o acesso é **OAuth 2.1** (Authorization Code + PKCE, *dynamic client registration*, access token de ~10min com refresh **rotativo**) no authorization server **`authn.read.ai`** (ORY Hydra). As credenciais ficam **criptografadas** por CSM (`user_integrations`) e o token é renovado em background. Nada hardcoded.

**Vínculo com a conta:** resolve pelo **domínio do participante externo** → tags/website da conta, com fallback pelo **nome no título**. Reuniões internas/sem cliente são **puladas** (ou enviadas a uma conta padrão, se configurado no admin).

**Administração:** `/admin/settings` → aba **Read.ai** (card **Webhooks** com URL + signing key + CSM padrão; ligar/desligar; conta padrão; app OAuth manual opcional; diagnóstico e "Rodar sincronização agora"). Backfill do histórico roda em ciclos pelo job horário. Implementação em [src/lib/integrations/readai/](../../src/lib/integrations/readai/) (`webhook.ts`, `oauth.ts`, `tokens.ts`, `client.ts`, `ingest.ts`, `sync.ts`).

---

## 1.1 Regras de Negócio

| Regra | Descrição |
|------|-----------|
| **Activity Types** | `preparation` (Preparo), `strategy` (Estratégia), `reporting` (Relatórios), `meeting` (Reunião), `support` (Suporte), `training` (Treinamento), `travel` (Deslocamento), `admin` (Admin) |
| **NLP Extraction** | Analisa descrição textual para detectar activity_type e account_id |
| **Confidence Threshold** | ≥ 0.8 para auto-detecção, caso contrário solicita confirmação |
| **Manual Override** | Usuário pode sobrescrever tipo detectado |
| **Duração Mínima** | 5 minutos |
| **Duração Máxima** | 8 horas por registro |
| **Data Futura** | Não permite registrar para datas futuras |

### Fluxo NLP

```
1. [Usuário descreve atividade]
2. [API analisa texto]
3. [Detecta activity_type e account_id]
4. [Se confidence ≥ 0.8 → preenche campos]
5. [Se confidence < 0.8 → sugere valores em branco]
6. [Usuário confirma ou corrige]
7. [Salva registro]
```

---

## 1.2 Componentes Visuais

### Header
- Breadcrumb: "Dashboard > Esforço"
- Título: "Registro de Esforço"

### EsforcoKPIs (Área de Input)
- **Textarea**: Campo único para digitar a atividade em linguagem natural (ex: "Passei 2h preparando o deck...").
- **Seletor de Conta**: Dropdown para selecionar a conta manualmente ou deixar em "Filtrar por Conta" (o sistema tentará detectar via IA).
- **Botão Registrar**: Dispara a chamada para a API.
- **Exemplos**: Cards com exemplos de frases para ajudar o usuário.

### EsforcoChart
- Gráfico de Pareto mostrando as horas acumuladas por conta.

### EsforcoTable
- Lista os registros de tempo do usuário.
- Colunas: Data, Conta, Atividade (Tipo e Descrição), Horas.
- Ações: Editar (abre modal).

---

## 1.3 Fluxo de Dados

```
[Usuário digita descrição e opcionalmente seleciona a conta]
    ↓
[Clique em "Registrar"]
    ↓
[POST /api/time-entries]
  Payload: { raw_text: string, account_id?: string }
    ↓
[API processa via Gemini AI]
    ├─ Extrai hours, activity_type, parsed_description
    └─ Detecta account_id (se não enviado)
    ↓
[Se account_id não detectado nem enviado]
    ↓ Retorna 422 { error, parsed }
[Front-end exibe toast "LOGO não identificado. Selecione manualmente"]
    ↓
[Usuário seleciona conta no dropdown e tenta novamente]
    ↓
[Se sucesso: Retorna 200 com a entry criada]
    ↓
[Front-end adiciona ao topo da lista e exibe toast de sucesso]
```

---

## 1.4 Interações do Usuário

| Ação | Gatilho | Resultado |
|------|---------|-----------|
| Registrar esforço | Preenchimento do texto + clique em "Registrar" | Envia para API e processa via IA |
| Selecionar conta | Dropdown de contas | Define a conta explicitamente (ignora detecção de conta da IA) |
| Editar registro | Clique na linha/ícone de edição | Abre o `EffortEditModal` |
| Atualizar registro | Salvar no modal | Atualiza a lista local e persiste |

---

## 1.5 Requisitos Técnicos

### Autenticação
🔒 **Obrigatória** — redireciona para `/login` se não autenticado

### Dados
- **Tabela:** `time_entries`
- **RLS:** entries pertencentes ao CSM logado

### API Endpoints
| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/time-entries` | Lista entries do usuário |
| POST | `/api/time-entries` | Criar entry (processa via IA) |
| PATCH | `/api/time-entries/[id]` | Atualizar entry (reavalia derivados: re-vetoriza RAG e realoca wishlist na troca de conta) |
| GET | `/api/time-entries/[id]/deletion-preview` | Raio de impacto da exclusão (wishlist, RAG, tarefas sugeridas, interações) |
| DELETE | `/api/time-entries/[id]` | Excluir entry **em cascata** (limpa todos os derivados) |

---

## 1.6 Casos de Borda

| Caso | Comportamento |
|------|----------------|
| Texto vazio | Toast "Digite o que você fez" |
| IA não detecta logo | Erro 422, exige seleção manual no front-end |
| Confiança da IA < 0.8 | Registro criado mas marcado como `pending_review` no banco |
| Palavras de crise no texto | Força sentimento `-0.8` e gera interação de risco |
| Palavras de sucesso no texto | Força sentimento `0.8` e gera interação positiva |
| **Carga histórica muito longa** | A IA ecoa o `raw_text` fiel de cada reunião, então a saída cresce com o texto colado. O teto de saída é **32768 tokens**; se ainda assim truncar, o `salvageEntries` **recupera as reuniões completas** e descarta só a última cortada. Sem nenhuma recuperável → erro orientando a **colar menos reuniões por vez**. |
| **Carga histórica com problemas** | O preview valida (`validate-historical.ts`) e exibe avisos: **truncamento**, **data inválida** (erro → não sobe), **data futura** e **duplicata por conteúdo**. Erros e duplicatas vêm **desmarcados** por padrão; o usuário revisa e só sobe o que estiver marcado em "Importar". |

---

## 1.7 Histórico

| Data | Alteração |
|------|------------|
| Abr/2026 | Versão inicial |
| Jun/2026 | **Carga histórica de esforços**: painel "Carga histórica" (cola um bloco com várias reuniões → a IA separa por data e registra cada esforço com a data real, vetorizado no RAG). `parseHistoricalEfforts` (multi-entrada) + `persistHistoricalEffort` + `POST /api/time-entries/bulk` (preview/commit). Tarefas criadas por padrão, mas **respeita** instrução de "não registrar atividades" por reunião (`skip_tasks`), com toggle no preview. |
| Jun/2026 | **Fix carga histórica em textos longos + validação no preview**: textos grandes davam *"IA retornou formato inválido"* porque a resposta truncava no teto padrão de 2048 tokens (o prompt ecoa o `raw_text` fiel de cada reunião → saída ≥ tamanho do texto colado). (1) `parse-historical-efforts.ts`: teto elevado para **32768 tokens**, **salvage** de JSON truncado (`salvageEntries` recupera as reuniões completas e descarta só a última cortada, sinaliza `truncated`) e erro acionável. (2) **Validação antes do commit** (`validate-historical.ts`): o preview retorna `warnings` (truncamento, data inválida/futura, duplicata por conteúdo); a UI mostra banners + badges e um checkbox **"Importar"** por reunião (erros/duplicatas desmarcados por padrão) — só sobe o que estiver marcado. |
| Jun/2026 | **Cascade — cobertura de oportunidades + risco zerado**: a cascade passou a remover também `opportunity_signals` (+ embeddings + recompute de demanda do item) — o módulo de Oportunidades é posterior e não era coberto. E ao remover a ÚLTIMA fonte da conta (sem interações/tickets), o risco preditivo agora é **zerado** (avaliação neutra que supera a `at-risk` antiga + resolve alertas de churn/playbook sem base) — antes o `runPredictiveRiskAnalysis` não inseria nada quando não havia dados, deixando o risco "preso" a um evento removido. |
| Jun/2026 | **Read.ai → esforço automático**: reuniões do Read.ai entram sozinhas como esforço (`activity_type='meeting'`, horas = duração) + interação com transcrição completa + RAG + tarefas (action items). Conexão por **OAuth 2.1** por CSM (sem token estático; credenciais criptografadas, refresh em background). Vínculo à conta por domínio do participante/título. Admin em `/admin/settings` → Read.ai. Implementação em `src/lib/integrations/readai/` (`oauth.ts`, `tokens.ts`, `ingest.ts`, `sync.ts`). |
| Jun/2026 | **Read.ai por Webhooks (PUSH) + endpoints OAuth reais + config 100% no banco**: além do OAuth (pull), o Read.ai empurra cada reunião para `/api/integrations/readai/webhook` (assinatura HMAC-SHA256, resolve CSM por owner.email). Endpoints OAuth reais confirmados (`authn.read.ai`). **Chave-mestra de criptografia** (`ENCRYPTION_KEY`) movida para `app_settings.encryption_key` (auto-provisionada) — corrige o erro ao salvar o token. **Calendário Microsoft 365** (agenda do dia na home): credenciais do app Azure AD movidas de env para `app_settings.microsoft_integration`, com aba **Configurações → Calendário (Microsoft)** e `redirect_uri` derivado do request — corrige `NEXT_PUBLIC_MS_CLIENT_ID não configurada`. Para quem não pode registrar app no Azure (TI bloqueou), há o **fallback ICS**: o CSM cola o link `.ics` publicado do Outlook no widget e a agenda aparece (recorrência expandida via node-ical, link guardado criptografado por usuário). Tudo no banco, zero env. |
| Jun/2026 | **Integridade na exclusão/edição** (`src/lib/effort/effort-cascade.ts`): um esforço alimenta `interactions`, `wishlist_signals`, `embeddings` (RAG) e `csm_tasks` sugeridas. A FK `interactions.time_entry_id` é CASCADE, mas wishlist/embeddings são polimórficos (sem FK) e viravam **órfãos** ao deletar. Agora a exclusão é **em cascata** e precedida de um **diálogo de confirmação** (`EffortEditModal`) que lista o raio de impacto via `GET .../deletion-preview`. Tarefas já iniciadas/concluídas e eventos de onboarding são **preservados** (desvinculados). Na **edição**, re-vetoriza o RAG da interação e realoca os sinais de wishlist quando a conta muda. **Sem triggers** — limpeza centralizada na aplicação. Órfãos legados foram removidos do banco. |