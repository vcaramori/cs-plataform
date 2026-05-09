# ⚙️ Tech Stack Decisions — Wave 5 Final

**Status:** ⏳ PENDING TEAM DECISION  
**Owner:** Dev Lead + Arquiteto  
**Deadline:** Antes do kick-off (esta semana)

---

## 1️⃣ PLAYBOOK BUILDER CANVAS

### Opção A: **ReactFlow** (Recomendado)

**Pros:**
- ✅ Production-ready, usado por Zapier/Make/n8n
- ✅ Suporta drag-drop, zoom, pan out-of-box
- ✅ Comunidade grande, documentação excelente
- ✅ Performance otimizada (canvas 200+ nós)

**Cons:**
- 📦 Dependência extra (~30KB gzipped)
- 🔧 Setup inicial 2-3 dias

**Estimate:** 1.5 SP

---

### Opção B: **Custom Div-Based Canvas**

**Pros:**
- ✅ Zero dependências externas
- ✅ Customização 100%
- ✅ Leve (~5KB)

**Cons:**
- ❌ Implementar drag-drop é complexo
- ❌ Performance degrada com 50+ nós
- ❌ Precisa de polimento pós-launch

**Estimate:** 3 SP

---

### ✅ **RECOMENDAÇÃO: ReactFlow**
- Qualidade > tempo
- Comunidade resolve bugs rapidinho
- Renovável para Wave 6 features (chaining, conditional flows)

---

## 2️⃣ ADOPTION HEATMAP CHART

### Opção A: **Recharts** (Atual)

**Pros:**
- ✅ Já usamos em Renewal Cockpit, Health Score
- ✅ Responsivo, acessível (a11y)
- ✅ Performance ~100 células OK

**Cons:**
- ⚠️ Customização limitada para heatmap
- ⚠️ Cores não tão vibrantes

**Estimate:** 1 SP

---

### Opção B: **Visx (Airbnb)**

**Pros:**
- ✅ Heatmap é use case nativo
- ✅ Cores customizáveis (CSS-in-JS)
- ✅ Performance excelente (1000+ cells)

**Cons:**
- 📚 Aprendizado maior (composição baixo-nível)
- 📦 ~40KB gzipped

**Estimate:** 2 SP

---

### Opção C: **D3 (Full Control)**

**Pros:**
- ✅ Máxima customização
- ✅ Animações suaves

**Cons:**
- ❌ Steep learning curve
- ❌ Slow to build (~3-4 SP)
- ❌ Overhead desnecessário

**Estimate:** 4 SP

---

### ✅ **RECOMENDAÇÃO: Visx**
- Melhor para heatmap específico
- Performance futura
- Design consegue controlar cores

---

## 3️⃣ RAG LLM PROVIDER

### Opção A: **Gemini Pro** (Current)

**Pros:**
- ✅ Já integrado (highlights, PDF, VoC)
- ✅ Rate limits generosos (60 req/min)
- ✅ Custo baixo (~$0.0005/1K tokens)
- ✅ Context window 30K tokens

**Cons:**
- ⚠️ Menos determinístico que Claude
- ⚠️ Prompt engineering precisa de tuning

**Cost/month:** ~$50 (estimado)

---

### Opção B: **Claude 3.5 Sonnet**

**Pros:**
- ✅ Melhor reasoning (RAG modes)
- ✅ Mais determinístico
- ✅ Excelente pra análise de contexto

**Cons:**
- 💰 Custo ~3x mais alto (~$0.003/1K tokens input)
- ⚠️ Rate limits menores (default 100K tokens/min)
- 📦 Precisa de ajustes em prompts existentes

**Cost/month:** ~$150 (estimado)

---

### Opção C: **Hybrid (Gemini + Claude)**

**Pros:**
- ✅ Gemini pra tasks simples (summary, highlights)
- ✅ Claude pra RAG modes complexos (multi-source context)
- ✅ Otimização de custo + qualidade

**Cons:**
- 🔧 Mais complexo de manter
- 📊 Análise custo-benefício por epic

**Cost/month:** ~$80-100 (híbrido)

---

### ✅ **RECOMENDAÇÃO: Hybrid (Gemini + Claude)**
- Gemini: Highlights, PDF, VoC summary (simples)
- Claude: RAG modes (multi-source, reasoning) — Epic 18
- Savings: ~50% vs Claude puro

---

## 4️⃣ VoC ANALYZER CACHE

### Opção A: **Redis Cache** (Recommended for Production)

**Pros:**
- ✅ Subsecond latency
- ✅ TTL automático
- ✅ Pub/Sub para invalidação
- ✅ Escalável (cluster ready)

**Cons:**
- 🔧 Setup + maintenance
- 💰 +$10-15/mês Vercel Redis

**Implementation:** 1 SP

---

### Opção B: **In-Memory Cache (Node)**

**Pros:**
- ✅ Zero cost
- ✅ Fácil de implementar (lru-cache package)
- ✅ Suficiente para <1000 interações/dia

**Cons:**
- ⚠️ Perde cache em cada deploy
- ⚠️ Não escalável multi-instance

**Implementation:** 0.5 SP

---

### Opção C: **Supabase Cache (table + TTL trigger)**

**Pros:**
- ✅ Usa infraestrutura existente
- ✅ RLS automático
- ✅ Queryable (debugging)

**Cons:**
- ⚠️ Latência maior (10-50ms)
- ⚠️ Não ideal para high-frequency

**Implementation:** 2 SP

---

### ✅ **RECOMENDAÇÃO: In-Memory (Now) + Redis (Wave 6)**
- **Wave 5:** Usar lru-cache, OK para volume esperado
- **Wave 6:** Migrar para Redis quando scaling
- **Budget:** 0 agora, +$15 depois

---

## 5️⃣ MOBILE APP START

### Opção A: **Start Now (Wave 5.5)**

**Pros:**
- ✅ Early adoption feedback
- ✅ Dev team already knows codebase

**Cons:**
- ❌ Distração do Wave 5 core
- ❌ Team burnout
- ❌ 40 SP = 2 meses extra

**Timeline:** +8 weeks

---

### Opção B: **Wave 6 Start (July 26)**

**Pros:**
- ✅ Wave 5 core stable + tested
- ✅ Design pode fazer mockups em paralelo
- ✅ Reusa componentes React (learned patterns)

**Cons:**
- ⚠️ Atrasa mobile 2 meses

**Timeline:** On schedule

---

### Opção C: **Wave 7 Only (December 26)**

**Pros:**
- ✅ Web fully baked
- ✅ Reusa APIs, patterns

**Cons:**
- ❌ Mobile não é MVP (atrasa v2.0)

**Timeline:** Risk de não bater Abril 2027

---

### ✅ **RECOMENDAÇÃO: Wave 6 Start (July)**
- Design mockups NOW (paralelo Wave 5)
- Dev team rested após Wave 5
- React Native reusa 60% web logic

---

## 📋 DECISION MATRIX

| Tech | Wave 5 Decision | Owner | Impact |
|------|---|---|---|
| **Playbook Canvas** | ✅ ReactFlow | Dev Lead | +1.5 SP |
| **Adoption Heatmap** | ✅ Visx | Design + Dev | +2 SP |
| **RAG LLM** | ✅ Hybrid (Gemini+Claude) | Arquiteto | 🔧 Prompts |
| **VoC Cache** | ✅ In-Memory (now) | Dev | 0 SP |
| **Mobile Start** | ✅ Wave 6 (July) | Product | Timeline OK |

---

## 🎯 VALIDATION CHECKLIST

- [ ] Dev Lead assina ReactFlow decision
- [ ] Design assina Visx + mockups
- [ ] Arquiteto assina Hybrid LLM strategy
- [ ] Product assina mobile Wave 6
- [ ] Budget (Redis future): aprovado

---

**Após assinatura: KICK-OFF IMEDIATAMENTE**
