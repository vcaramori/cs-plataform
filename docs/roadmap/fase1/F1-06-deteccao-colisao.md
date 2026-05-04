# F1-06: Detecção de Colisão

## Contexto

Dois CSMs abrem mesmo ticket simultaneamente, ambos fazem mudanças. Quem edita por último sobrescreve o outro. Colisão silenciosa resulta em conflitos não resolvidos.

Detecção de colisão avisa: "⚠️ Alice está trabalhando neste ticket agora." CSM vê aviso, dialoga com colega, reduz duplicação de esforço.

---

## Escopo

**É:**
- Real-time detection: quando CSM A abre ticket, sistema registra presença
- Aviso toast: "Alice (alice@...) está neste ticket agora" com dismiss button
- Detection via Supabase Presence (real-time) ou polling (5s intervals)
- Aviso persiste enquanto outro CSM tiver ticket aberto
- Auto-dismiss quando outro CSM fecha ticket
- Aplica a preview panel (F1-05) e detail page (se existir)

**Não é (MVP):**
- Lock (impedir mudanças quando outro CSM está)
- Merge de mudanças conflitantes (CRDT complexity)
- Chat em tempo real (F3)
- Workspace collaboration mode (F3+)

---

## Decisões de Design (UX)

**Presence Registration:**
- On open ticket: POST `/api/ticket-presence` com `{ ticket_id, action: 'open' }`
- On close ticket: POST `/api/ticket-presence` com `{ action: 'close' }`
- Timeout auto-cleanup: se presence não renovada por 30s, assume user left

**Toast Warning:**
- Posição: top-right
- Ícone: ⚠️ alert
- Texto: "[Name] (email) está trabalhando neste ticket"
- Color: `bg-warning-surface` text `text-warning`
- Button: "Entendi" (dismiss, ainda mostra badge nas ações)
- Auto-dismiss: never (stay visible while colliding)

**List Indicator:**
- Badge next to ticket name: 👥 "2 users" (subtle, não intrusivo)
- On hover: "Alice e Bob estão aqui"

**Real-time Source:**
- **Option 1 (MVP):** Supabase Realtime Presence (built-in, simpler)
- **Option 2:** Polling via `/api/ticket-presence?ticket_id=X` every 5s
- Recomendação: use Option 1 para melhor UX

---

## Schema / Migrações

**Tabela nova (ou Supabase Presence, sem schema):**

```sql
-- Se usar tabela em vez de Supabase Presence:
CREATE TABLE ticket_presence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opened_at timestamptz DEFAULT now(),
  last_heartbeat timestamptz DEFAULT now(),
  UNIQUE(ticket_id, user_id)
);

CREATE INDEX idx_ticket_presence_ticket_id ON ticket_presence(ticket_id);
CREATE INDEX idx_ticket_presence_user_id ON ticket_presence(user_id);
```

**Se usar Supabase Realtime:** Nenhuma tabela (built-in).

---

## Arquivos Afetados

- `src/app/(dashboard)/suporte/components/TicketPreviewPanel.tsx` — add presence listener, toast
- `src/app/api/ticket-presence/route.ts` — POST register/unregister presence
- `src/lib/hooks/useTicketPresence.ts` — custom hook (Supabase Presence or polling)
- `src/lib/services/presenceService.ts` — abstração de Presence (swap implementation)

---

## Padrões a Seguir

**Supabase Realtime:** [Docs](https://supabase.com/docs/guides/realtime)
```typescript
// src/lib/hooks/useTicketPresence.ts
import { useEffect, useState } from 'react';
import { useSupabaseClient } from '@supabase/auth-helpers-react';

export function useTicketPresence(ticketId: string) {
  const supabase = useSupabaseClient();
  const [presentUsers, setPresentUsers] = useState([]);

  useEffect(() => {
    const channel = supabase.channel(`ticket:${ticketId}`);
    
    channel.on('presence', { event: 'sync' }, () => {
      setPresentUsers(channel.presenceState());
    }).subscribe();

    return () => channel.unsubscribe();
  }, [ticketId, supabase]);

  return presentUsers;
}
```

**Toast:** Use existing toast library (Sonner or react-hot-toast)

**LLM:** Não aplica

---

## Complexidade Estimada

**P (Pequeno)** — 0.5 sessões BMAD

- Supabase Presence setup (straightforward)
- Hook custom + toast integration
- API endpoint presence (simples CRUD)

---

## Dependências

**Precisa que:** F1-05 (preview panel)

**Bloqueia:** Nenhum

---

## Critérios de Aceite

### Funcional

- [ ] F1 — CSM A abre ticket, CSM B abre mesmo ticket → CSM B vê toast "Alice está aqui"
- [ ] F2 — Toast mostra nome + email de CSM A
- [ ] F3 — CSM A fecha ticket → toast desaparece de CSM B (auto-dismiss)
- [ ] F4 — 2+ CSMs abertos: toast lista todos (e.g. "Alice e Bob estão aqui")
- [ ] F5 — List view mostra badge 👥 ao lado de ticket com múltiplos users
- [ ] F6 — Hover badge → tooltip "Alice e Bob estão neste ticket"
- [ ] F7 — Session timeout (30s inatividade) → CSM auto-removed de presence
- [ ] F8 — Abortar sessão (crash) → Supabase auto-cleanup em < 1 min
- [ ] F9 — Deep link `/suporte?preview=123` abre presence listener
- [ ] F10 — Presence isolado por ticket (CSM A em 123, CSM B em 456, não colidem)

### Edge Cases

- [ ] E1 — Mesmo user abre ticket em 2 abas: conta como 1 user ou 2?
- [ ] E2 — CSM com network intermitente: presence flickers (heartbeat falha)
- [ ] E3 — Deleted user still shows in presence: cleanup correctly
- [ ] E4 — Toast already open, another user joins: toast updates or new toast?

### Performance

- [ ] P1 — Presence detection < 2s latency (Supabase Realtime SLA)
- [ ] P2 — Toast render doesn't block list (< 100ms)
- [ ] P3 — 100 concurrent presence channels no CPU spike

### Isolamento

- [ ] T1 — Presence data isolated by org (RLS)
- [ ] T2 — CSM A doesn't see org B presence

---

## Definition of Done

Ver [docs/roadmap/_definition-of-done.md](../_definition-of-done.md)

**Padrão adicional para Real-time Feature:**
- [ ] F1-F4: Presence detection end-to-end
- [ ] P1: Latency < 2s
- [ ] T1-T2: RLS verified

**Testes obrigatórios:**
```
E2E (Playwright multi-tab):
1. Open tab A → ticket 123
2. Open tab B → same ticket 123
3. Tab A should see toast "User B is here"
4. Close tab B → tab A toast auto-dismiss

Unit:
- useTicketPresence hook test
- Presence timeout cleanup
```

**Fixtures:**
- 10 tickets
- 3 CSMs with real accounts

---

## Notas

1. **Supabase Presence vs Polling** — Presença é melhor para real-time, mas polling (5s) é fallback simples se Realtime falhar.
2. **Session timeout** — 30s sem heartbeat é razoável. Ajustar baseado em network latency.
3. **Toast UX** — múltiplos users: mostrar "Alice, Bob, Carol estão aqui" (truncar se > 3).
4. **Future enhancement** — F3 pode adicionar in-ticket chat baseado no mesmo presence channel.

---

## Links Relacionados

- Mapa de componentes: [_components-map.md](_components-map.md) → `useTicketPresence`
- Anterior: [F1-05 Preview Inline](F1-05-preview-inline.md)
- Próximo: [F1-07 Urgency Scoring](F1-07-urgency-scoring.md)
