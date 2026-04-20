# AGENTS.md — Guia para Agentes de IA

Este projeto é o **CS-Continuum**, plataforma interna de Customer Success da Plannera para gestão de clientes S&OP/S&OE.

## Quick Reference

| Item | Valor |
|------|------|
| Stack | Next.js 16 + React 19 + TypeScript + Tailwind + Radix UI |
| Banco | Supabase (PostgreSQL + pgvector) |
| LLM | Ollama (qwen2.5) → Gemini → Claude (fallback em cascata) |
| Docs Oficial | https://nextjs.org, https://supabase.com/docs |

## Estrutura de Arquivos

```
csplataform/
├── AGENTS.md                       ← Este arquivo
├── .claude/
│   └── napkin.md                  ← Regras de execução (lido automaticamente)
├── docs/product/                   ← Especificação de produto (PM/PO)
├── docs/skills/                   ← Skills por área
├── README.md                      ← Documentação completa do projeto
└── .env.example                  ← Variáveis de ambiente
```

## Regras Obrigatórias

1. **Leia README.md e docs/product/ ao iniciar** — São a fonte de verdade
2. **Atualize README.md** toda vez que adicionar/modificar/remover funcionalidades
3. **Atualize docs/product/** quando criar/alterar regras de negócio
4. Use Server Components por padrão (`app/` router)
5. Prefira `use()` hook para data fetching em vez de useEffect
6. Use Radix UI + Tailwind para componentes (não MUI/chakra)
7. Implemente fallback em cascata para LLM (OLLAMA → GEMINI → CLAUDE)
8. Habilite RLS em todas as tabelas do Supabase
9. Use .env para todas as chaves (não comitar)
10. **Leia `.claude/napkin.md` para regras de execução (lido automaticamente por napkin)**
11. **SEGURANÇA DE CÓDIGO: NUNCA execute `git restore .`, `git reset --hard` ou qualquer comando que descarte alterações não trabalhadas sem permissão explícita do usuário.** O trabalho não commitado é sagrado.

## Skills por Área

> Nota: Regras de execução estão em `.claude/napkin.md` (lido automaticamente).

| Área | Arquivo | Quando usar |
|------|--------|-----------|
| Web scraping | `docs/skills/firecrawl.md` | Pesquisas, coleta de dados, RAG |
| Browser | `docs/skills/playwright-mcp.md` | Automação E2E, testes |
| PDF | `docs/skills/pdf.md` | Extração, criação PDF |
| Spreadsheeta | `docs/skills/xlsx.md` | Export/Import Excel, dados tabulares |
| Frontend | `docs/skills/nextjs-react.md` | Componentes, rotas, API routes |
| Interface | `docs/skills/interface-design.md` | Tailwind, Radix UI, shadcn/ui |
| Banco/RAG | `docs/skills/supabase-pgvector.md` | Queries,embeddings, similarity search |
| LLM | `docs/skills/llm-gateway.md` | Chamadas IA, fallback, retry |
| Supply Chain | `docs/skills/sop-soe.md` | KPIs, forecasting, OTIF |
| CS | `docs/skills/customer-success.md` | Health score, NPS, adoption |

## Variáveis Obrigatórias

Verifique `.env.example` para lista completa:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# LLM (mínimo um)
GEMINI_API_KEY=
# ou
ANTHROPIC_API_KEY=

# LLM Gateway
LLM_PROVIDER=ollama  # ou gemini
LLM_ALLOW_FALLBACK=true
```