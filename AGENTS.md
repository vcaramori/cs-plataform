# AGENTS.md — Guia para Agentes de IA

Este projeto é o **CS-Continuum**, plataforma interna de Customer Success da Plannera para gestão de clientes S&OP/S&OE.

## Quick Reference

| Item | Valor |
|------|------|
| Stack | Next.js 16 + React 19 + TypeScript + Tailwind + Radix UI |
| Banco | Azure SQL (SQL Server — relacional + VECTOR nativo) |
| Auth | NextAuth.js (roles: `csm` / `client`) |
| LLM | Ollama (qwen2.5) → Gemini → Claude (fallback em cascata) |
| Docs Oficial | https://nextjs.org, https://learn.microsoft.com/azure/azure-sql |

## Estrutura de Arquivos

```
csplataform/
├── AGENTS.md                       ← Este arquivo
├── .agent/                         ← Antigravity Kit (agentes, workflows, rules)
│   ├── ARCHITECTURE.md            ← Arquitetura do kit
│   ├── agents/                    ← 20 agentes especialistas
│   ├── workflows/                 ← 11 workflows (slash commands)
│   └── rules/                     ← Regras globais (GEMINI.md)
├── .claude/
│   └── napkin.md                  ← Regras de execução (lido automaticamente)
├── docs/product/                   ← Especificação de produto (PM/PO)
├── docs/skills/                    ← TODAS as skills (projeto + Antigravity Kit)
├── docs/architecture/              ← Decisões de arquitetura
├── README.md                       ← Documentação completa do projeto
└── .env.example                   ← Variáveis de ambiente
```

## Regras Obrigatórias

1. **Leia README.md e docs/product/ ao iniciar** — São a fonte de verdade
2. **Atualize README.md** toda vez que adicionar/modificar/remover funcionalidades
3. **Atualize docs/product/** quando criar/alterar regras de negócio
4. Use Server Components por padrão (`app/` router)
5. Prefira `use()` hook para data fetching em vez de useEffect
6. Use Radix UI + Tailwind para componentes (não MUI/chakra)
7. Implemente fallback em cascata para LLM (OLLAMA → GEMINI → CLAUDE)
8. Use Azure SQL via `src/lib/azure-sql/client.ts` — não Supabase
9. Use .env para todas as chaves (não comitar)
10. **Leia `.claude/napkin.md` para regras de execução (lido automaticamente por napkin)**
11. **SEGURANÇA DE CÓDIGO: NUNCA execute `git restore .`, `git reset --hard` ou qualquer comando que descarte alterações não trabalhadas sem permissão explícita do usuário.** O trabalho não commitado é sagrado.

## Skills por Área

> Todas as skills estão em `docs/skills/`. Inclui skills do projeto e do Antigravity Kit.

### Skills do Projeto

| Área | Arquivo | Quando usar |
|------|--------|-----------|
| Web scraping | `docs/skills/firecrawl.md` | Pesquisas, coleta de dados, RAG |
| Browser | `docs/skills/playwright-mcp.md` | Automação E2E, testes |
| PDF | `docs/skills/pdf.md` | Extração, criação PDF |
| Spreadsheet | `docs/skills/xlsx.md` | Export/Import Excel, dados tabulares |
| Frontend | `docs/skills/nextjs-react.md` | Componentes, rotas, API routes |
| Interface | `docs/skills/interface-design.md` | Tailwind, Radix UI, shadcn/ui |
| LLM | `docs/skills/llm-gateway.md` | Chamadas IA, fallback, retry |
| Supply Chain | `docs/skills/sop-soe.md` | KPIs, forecasting, OTIF |
| CS | `docs/skills/customer-success.md` | Health score, NPS, adoption |

### Skills do Antigravity Kit (ag-kit)

| Área | Diretório | Quando usar |
|------|-----------|-----------|
| API patterns | `docs/skills/api-patterns/` | REST, GraphQL, tRPC, auth, rate limiting |
| App builder | `docs/skills/app-builder/` | Scaffolding, detecção de stack, templates |
| Arquitetura | `docs/skills/architecture/` | Padrões, trade-offs, seleção de arquitetura |
| Clean code | `docs/skills/clean-code/` | Qualidade, legibilidade, boas práticas |
| Code review | `docs/skills/code-review-checklist/` | Checklist de revisão de código |
| Database design | `docs/skills/database-design/` | Schema, migrations, indexing, ORM |
| Deploy | `docs/skills/deployment-procedures/` | CI/CD, rollback, ambientes |
| Documentação | `docs/skills/documentation-templates/` | Templates de docs técnicas |
| Frontend design | `docs/skills/frontend-design/` | UX, design system, animações, tipografia |
| Next.js expert | `docs/skills/nextjs-react-expert/` | Performance, SSR, bundle, cache |
| Node.js | `docs/skills/nodejs-best-practices/` | Async, módulos, boas práticas |
| Agentes paralelos | `docs/skills/parallel-agents/` | Coordenação multi-agente |
| Performance | `docs/skills/performance-profiling/` | Lighthouse, Web Vitals, profiling |
| Plan writing | `docs/skills/plan-writing/` | Escrita de planos e especificações |
| SEO | `docs/skills/seo-fundamentals/` | SEO técnico, meta tags, structured data |
| Segurança | `docs/skills/vulnerability-scanner/` | Scan de vulnerabilidades, OWASP |
| Red team | `docs/skills/red-team-tactics/` | Testes ofensivos autorizados |
| Debugging | `docs/skills/systematic-debugging/` | Root cause analysis |
| Tailwind | `docs/skills/tailwind-patterns/` | Tailwind CSS v4 |
| TDD | `docs/skills/tdd-workflow/` | Test-driven development |
| Testing | `docs/skills/testing-patterns/` | Padrões de testes, pirâmide |
| Webapp testing | `docs/skills/webapp-testing/` | E2E, Playwright |
| Web design | `docs/skills/web-design-guidelines/` | 100+ regras de acessibilidade e UX |
| Brainstorm | `docs/skills/brainstorming/` | Ideação estruturada |
| Bash/Linux | `docs/skills/bash-linux/` | Shell scripting |
| PowerShell | `docs/skills/powershell-windows/` | Scripts Windows |
| i18n | `docs/skills/i18n-localization/` | Internacionalização |
| Mobile design | `docs/skills/mobile-design/` | iOS, Android, React Native |
| Game dev | `docs/skills/game-development/` | 2D, 3D, mobile games |

## Variáveis Obrigatórias

Verifique `.env.example` para lista completa:

```bash
# Azure SQL
AZURE_SQL_SERVER=
AZURE_SQL_DATABASE=cscontinuum
AZURE_SQL_USER=
AZURE_SQL_PASSWORD=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000

# LLM (mínimo um)
GEMINI_API_KEY=
# ou
ANTHROPIC_API_KEY=

# LLM Gateway
LLM_PROVIDER=ollama  # ou gemini
LLM_ALLOW_FALLBACK=true
```
