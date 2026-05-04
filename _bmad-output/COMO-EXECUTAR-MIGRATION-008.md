# Como Executar Migration 008

**Status:** ⏳ Pendente (erro de conexão ao Supabase em ambiente local)

## Opção A: Via Supabase Dashboard (Recomendado - 2 min)

1. Acesse: https://supabase.com/dashboard
2. Abra seu projeto CS-Continuum
3. Clique em **SQL Editor** (left sidebar)
4. Clique em **+ New Query**
5. Cole o conteúdo inteiro de: `supabase/migrations/008_phase1_foundation.sql`
6. Clique em **RUN**

**Pronto!** As 6 tabelas serão criadas:
- ✅ saved_views (F1-01)
- ✅ csm_queue_config (F1-14)
- ✅ ticket_merge_history (F1-10)
- ✅ ticket_similarity_candidates (F1-11)
- ✅ ticket_events (Auditoria)
- ✅ timeline_events (F2-01)

---

## Opção B: Via Supabase CLI (Se tiver instalado)

```bash
supabase migration up
```

---

## Opção C: Via Script (Se tiver acesso remoto)

```bash
npx tsx scripts/run-migration.ts
```

**Erro atual:** `ENOTFOUND db.mgkwaejxazwwevblqycd.supabase.co`  
**Causa:** Sem conexão à internet / Firewall bloqueando / Env vars incorretas  
**Solução:** Usar Opção A (Dashboard é mais rápido mesmo)

---

## Verificação

Após executar, verifique em Supabase Dashboard:

```sql
-- Ver tabelas criadas
SELECT * FROM saved_views LIMIT 0;
SELECT * FROM ticket_events LIMIT 0;
SELECT * FROM timeline_events LIMIT 0;
```

Se não der erro 404, tá criado! ✅

---

**Timestamp:** 2026-05-04 14:35  
**Responsável:** Próximo agente ou Vinicius
