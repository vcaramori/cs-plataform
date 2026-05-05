# F1-09: Auto-close Parametrizado & Gatilho de CSAT

## Contexto

Em vez de um fechamento fixo de 14 dias, o sistema deve respeitar um parâmetro (definido na política de SLA ou configuração global) para fechar tickets no estado "Resolvido" que não receberam réplica. Após o fechamento, o sistema deve disparar automaticamente uma pesquisa de satisfação (CSAT).

---

## Escopo

**É:**
- **Job de Fechamento**: Execução diária que busca tickets `status='resolved'`.
- **Parametrização**: O tempo de espera será buscado em `sla_policies.auto_close_hours`. Se não houver política, usa o padrão de 48h (ajustável via .env).
- **Gatilho de CSAT**: Todo ticket fechado automaticamente (ou manualmente via "Marcar como Resolvido" que atinja o timeout) deve disparar um e-mail de CSAT.
- **Validação de Réplica**: Se houver qualquer mensagem nova (`support_ticket_messages`) após a resolução, o contador de fechamento é resetado.
- **Log**: Evento `auto_closed` com payload informando o parâmetro utilizado.

**Não é (MVP):**
- Reenvio de e-mail de CSAT se o cliente não responder.
- Customização do template de e-mail por conta (padrão Plannera para todos).

---

## Decisões de Design (UX)

1.  **Configuração**: O CSM pode ajustar o `auto_close_hours` na tela de `/suporte/sla`.
2.  **Transparência**: O cliente recebe o e-mail de CSAT com o link para avaliação assim que o ticket é fechado.
3.  **Audit Trail**: O histórico do ticket mostrará: "Ticket fechado por inatividade (Regra: 48h). Pesquisa de CSAT enviada."

---

## Schema / Migrações

- Reutiliza `sla_policies.auto_close_hours`.
- Reutiliza `csat_tokens` e `csat_responses`.

---

## Padrões a Seguir

**Integração com CSAT Service:**
```typescript
// No job de fechamento
if (elapsedMs >= timeoutMs) {
  await closeTicket(ticket.id, 'auto_timeout');
  await sendCSATEmail(ticket.id); // Busca o contato correto do cliente
}
```

---

## Critérios de Aceite

- [ ] F1 — O Job identifica o tempo correto baseado na política de SLA da conta.
- [ ] F2 — Tickets resolvidos sem interação há X horas são fechados.
- [ ] F3 — Um token de CSAT é gerado e o e-mail é enviado ao encerrar o ticket.
- [ ] F4 — O e-mail de CSAT contém o link correto com o token único.
- [ ] F5 — Se o cliente responder enquanto o ticket está "Resolvido", ele não deve ser fechado pelo job.

---

## Definition of Done

- Código migrado para usar `auto_close_hours` dinâmico.
- Serviço de e-mail (Nodemailer) configurado para buscar o e-mail real do cliente (não o fixo de exemplo).
- Teste E2E: Criar ticket → Resolver → Forçar cron → Verificar status Fechado e recebimento de e-mail.
