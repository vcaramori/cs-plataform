---
project_name: 'CS-Continuum'
user_name: 'Vinicius Caramori'
date: '2026-04-28'
sections_completed: ['technology_stack', 'critical_rules', 'naming_conventions', 'safety']
existing_patterns_found: 12
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Framework**: Next.js 16.2.0 (App Router)
- **Library**: React 19.2.0
- **Language**: TypeScript 5.x (Strict Mode: Enabled)
- **Styling**: Tailwind CSS 3.4.1
- **UI Components**: Radix UI + Lucide React + Framer Motion
- **Database/Auth**: Supabase (PostgreSQL + pgvector)
- **State Management**: TanStack React Query 5.95.2
- **Forms & Validation**: React Hook Form 7.72.0 + Zod 4.3.6
- **LLM Layer**: Ollama (qwen2.5) -> Gemini -> Claude (Cascading Fallback)
- **Testing**: Playwright 1.59.1

---

## Critical Implementation Rules

1.  **Server Components First**: Use Next.js Server Components by default. Only use Client Components (`'use client'`) when interactivity is required.
2.  **Data Fetching**: Prefer the `use()` hook for data fetching over `useEffect`.
3.  **UI Library Constraint**: Use **ONLY** Radix UI + Tailwind for new components. Avoid MUI, Chakra, or other heavy component libraries unless explicitly requested.
4.  **Database Access**: Always use Supabase clients via `src/lib/supabase/`. Note that Azure SQL is the future target, but current implementation is Supabase.
5.  **LLM Fallback**: Implement the cascading logic (Ollama -> Gemini -> Claude) in any AI integration.

---

## Naming Conventions & Patterns

- **Components**: PascalCase (e.g., `ReplyReviewModal.tsx`).
- **Path Aliases**: Use `@/*` to refer to the `src/` directory.
- **Organization**: Components should be modular and reusable. Helpers go to `src/lib/` or `src/utils/`.

---

## Safety & Workflow

- **Git Safety**: **NEVER** execute `git restore .`, `git reset --hard`, or any command that discards uncommitted changes without explicit user permission.
- **Source of Truth**: Always read `README.md` and `docs/product/` at the start of a task.
- **Documentation**: Update `README.md` when adding/modifying features and `docs/product/` for business rule changes.
