# Governança de IA — Contexto Global · Instruções por Tarefa · Skills (MD) · Regras

> Status: entregue (2026-06-01).

## Problema & objetivo

A direção das IAs estava espalhada e em maioria hardcoded (só 5 instruções eram configuráveis). Objetivo: centralizar e tornar **tudo** configurável pela administração, com arquitetura **híbrida** e **defaults = comportamento atual** (migração segura).

## Arquitetura

```
buildSystemInstruction(taskKey, fallback?)  →  [ contexto global ] + [ skills aplicáveis ] + [ override OU default(catálogo) OU fallback ]
```

- **Contexto global** (`app_settings.ai_global_context`, texto): persona, tom, idioma, guardrails. Sempre injetado. Vazio = comportamento atual.
- **Instrução por tarefa**: cada call site passa seu texto atual como `fallback`; admin pode sobrescrever por `app_settings['<key>']`.
- **Skills** (tabela `ai_skills`, MD): `name`, `description`, `when_to_use`, `body`, `applies_to[]` (task keys ou `global`), `is_active`. Injetadas seletivamente por `applies_to`.
- **Regras numéricas** (`app_settings.ai_context_rules`): NPS, financeiro (renovação/discrepância), silêncio por segmento, contato de risco, fallback do RAG.

Cache de 60s em `ai-context.ts` + `invalidateAIContextCache()` chamado nos saves.

## Catálogo de tarefas (`instructions-catalog.ts`)

~24 tarefas com `{ key, label, domain, triggerType }`, agrupadas por domínio: RAG/Assistente, Suporte, Saúde/Risco, Adoção, Engajamento, Interações/Esforço, Wishlist. Dirige a aba admin (lista/edição) e o `applies_to` das skills.

## Onde editar

`/admin/settings` → aba **"IA — Contexto & Regras"** (`AIContextSettingsTab`):
- Contexto global (+ "aplicar recomendado").
- Regras numéricas (form).
- Instruções por tarefa (textarea por tarefa; vazio = default do código).
- Biblioteca de Skills (`SkillDialog`).

APIs: `/api/admin/settings` (POST `module:'ai_context'`, GET inclui as keys) e `/api/admin/ai-skills[/id]` (CRUD). Gating admin/super_admin.

## Cobertura (call sites migrados)

RAG/chat/review-reply/shadow-score/auto-checkin (via `loadInstruction` que delega) + wishlist (extractor/match/narrativa) + suporte (urgência/resumo/categoria/intenção/sugestão/análise/sentimento/ingest/pdf) + interações (sentimento/horas) + parse de esforço + risco preditivo + adoção (forecast/bloqueios) + meeting-prep.

Regras numéricas threaded: auto-checkin (silêncio por segmento), rag-pipeline (renovação, discrepância de health, fallback). **Não threaded:** faixas de NPS (`getNPSSegment`, sync) — anotado.

## Verificação

1. Migration `ai_governance_foundation` aplicada (`ai_skills` + seeds). `next build` ✅.
2. Sem overrides/contexto global vazio → IAs produzem a mesma saída de antes (defaults preservados).
3. Editar contexto global (ex.: "responda formal") → reflete em várias IAs.
4. Criar Skill `applies_to=['wishlist_extractor']` → corpo entra no system instruction só daquele extrator; `applies_to=['global']` → todas.
5. Editar `ai_context_rules` (ex.: renovação urgente 60 dias) → muda o alerta de renovação no contexto do RAG; silêncio por segmento muda o auto-checkin.

## Follow-up

- Threading das faixas de NPS via config (refactor de `getNPSSegment` para async ou injeção).
- Defaults visíveis na UI por tarefa (hoje o default vive no call site; UI mostra placeholder).
- Seleção de skills assistida por IA (hoje explícita por `applies_to`).
- Versionamento/histórico de prompts.
