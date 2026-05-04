# F1-05: Preview Inline

## Contexto

CSM olha lista de 47 tickets. Vê um ticket que parece importante, clica para abrir detail view em nova página. Espera load, scrolla muito para achar informação. Solução: hover/click em linha → side panel aparece com contexto completo (replies, customer, SLA) sem sair da lista.

Preview inline substitui full page detail view. Painel lateral responsivo oferece ações inline (assign, change status, add tags) e opção "Abrir em nova aba" se needed.

---

## Escopo

**É:**
- Click na linha de ticket → side panel aparece (90% viewport width, fixo à direita)
- Painel mostra: subject, customer, description, última reply, SLA status, tags, attachments, mini timeline
- Ações inline: botão assign, dropdown status, botão add tags, botão add note
- Deep link funciona: `/suporte?view=all&preview=ticket-123` abre preview
- Responsive: em mobile (< 768px), preview hidden (ou modal em full screen)
- Close button: X, clique fora, ESC key, ou back arrow

**Não é (MVP):**
- Full timeline in preview (show last 3 replies, link "Ver todas")
- Edit subject/description inline
- Attachment upload
- Comments (thread-like UX — F2)

---

## Decisões de Design (UX)

**Preview Panel:**
- Position: fixed right, top to bottom
- Width: 90% on desktop (max 600px), 100% on mobile
- Background: `bg-surface-background`
- Header: [ticket icon] [subject] [X close]
- Body: customer card, SLA badge, description, last 3 replies (collapsed), tags
- Footer: action buttons (Assign, Status, Add Tags, Add Note, ... Open in New Tab)
- Animation: slide-in 300ms from right (Framer Motion)

**Content sections (collapsible):**
- Customer info: name, email, account
- SLA: status badge (ok/atencao/vencido) + time remaining
- Description: full text, scrollable if long
- Replies: "Showing last 3 / View all" link
- Timeline mini: created_at, last_updated_at
- Tags: pill list, removable inline

**Inline Actions:**
- Assign: click → dropdown CSM list → select → save (no modal)
- Status: click → dropdown (open, in_progress, resolved, closed) → select
- Add Tags: click → modal with checkboxes (reusa modal from F1-03?)
- Add Note: click → textarea + send button (adds reply as internal note)

**Mobile behavior:**
- < 768px: preview converts to modal (full screen, bottom sheet, or tab?)
- Or: hide preview completely, deep link routes to detail page instead
- MVP decision: hide preview, keep list-only on mobile

---

## Schema / Migrações

**Nenhuma nova** — reutiliza support_tickets schema já existente.

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/TicketPreviewPanel.tsx` — novo componente painel
- `src/app/(dashboard)/suporte/components/TicketListRow.tsx` — click handler para abrir preview
- `src/app/(dashboard)/suporte/components/SuporteClient.tsx` — state para qual ticket está em preview
- `src/app/(dashboard)/suporte/components/PreviewActionBar.tsx` — buttons assign/status/tags/note
- `src/lib/hooks/usePreviewPanel.ts` — custom hook para abrir/fechar (query params)

---

## Padrões a Seguir

**Componente de referência:** [src/app/(dashboard)/suporte/components/SuporteClient.tsx](../../src/app/(dashboard)/suporte/components/SuporteClient.tsx)
- Client-side state (useSearchParams, useRouter para deep link)
- TanStack React Query para fetch ticket detail

**Animations:** Framer Motion `AnimatePresence` + `motion.div`

**Design tokens:** `bg-surface-background`, `border-border-divider`, `text-foreground-secondary`

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- TicketPreviewPanel: reutiliza componentes já existentes
- Animações: Framer Motion (straightforward)
- State management: useSearchParams (simples)
- RLS: já feito em existing detail view

---

## Dependências

**Precisa que:** F1-01 (support_tickets schema)

**Bloqueia:** Nenhum (parallelizável)

---

## Critérios de Aceite

### Funcional

- [ ] F1 — Click em linha de ticket abre preview panel (slide-in 300ms)
- [ ] F2 — Preview mostra: subject, customer, description, last 3 replies, SLA status
- [ ] F3 — Clique em "Assign" abre dropdown CSMs, seleciona, salva inline
- [ ] F4 — Clique em status dropdown, seleciona novo status, ticket list atualiza
- [ ] F5 — Clique "Add Tags" abre modal (reusável), salva tags no ticket
- [ ] F6 — Clique "Add Note" abre textarea, digita, clique "Enviar", note aparece em replies
- [ ] F7 — Click fora do painel fecha (ou click X no header)
- [ ] F8 — ESC key fecha painel
- [ ] F9 — Deep link `/suporte?preview=ticket-123` abre preview do ticket correto
- [ ] F10 — Fechar preview volta URL para sem query param

### Edge Cases

- [ ] E1 — Abrir preview ticket que foi deletado: mostra erro "Ticket não encontrado"
- [ ] E2 — Preview aberto, outro user fecha ticket: preview mostra status updated (real-time)
- [ ] E3 — Mobile < 768px: preview hidden, ou redireciona para detail page?
- [ ] E4 — Muitos replies: mostra "Últimas 3 replies / Ver todas [N]"

### Performance

- [ ] P1 — Preview abre em < 300ms (não wait full detail load)
- [ ] P2 — Inline actions (assign/status) não bloqueiam UI (< 100ms)
- [ ] P3 — Panel with 5MB attachments renders in < 500ms

### Isolamento

- [ ] T1 — Preview de ticket que user não tem permissão: 403 error
- [ ] T2 — CSM A não consegue abrir preview de CSM B ticket (se privado)

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para List/Filtro:**
- [ ] F1-F8: Painel behavior completo
- [ ] T1-T2: RLS verificado

**Testes obrigatórios:**
```
E2E:
1. Click ticket → preview abre → click Assign → seleciona CSM → assigned_to muda
2. Preview aberto → ESC key → fecha (URL updates)
3. Deep link /suporte?preview=123 → preview abre
4. Tenant isolation: CSM A não abre ticket de CSM B

Playwright:
- Animation timing (300ms)
- Inline actions reflect in list without reload
```

**Fixtures:**
- 20 tickets com diferentes customer/SLA/reply counts
- 3 CSMs

---

## Notas

1. **Deep linking** — usar `useSearchParams()` + `useRouter().push()` para gerenciar estado URL.
2. **Real-time updates** — considerar Supabase Realtime subscription para updates enquanto preview aberto (fase 2).
3. **Mobile strategy** — MVP é hide preview, F2 pode adicionar bottom sheet ou modal.
4. **Performance** — fetch ticket detail only when preview opens (lazy load), não na list render.
5. **Attachment handling** — mostrar thumbnails/icons (não download inline), link para "Ver anexo" abre em nova aba.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `TicketPreviewPanel`, `PreviewActionBar`
- Anterior: [F1-04 Busca Semântica](F1-04-busca-semantica.md)
- Próximo: [F1-06 Detecção de Colisão](F1-06-deteccao-colisao.md)
