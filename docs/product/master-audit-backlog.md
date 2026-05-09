# Backlog de Auditoria Mestre - Problemas Encontrados

Este arquivo serve para centralizar todos os problemas, débitos técnicos e quebras de padrão identificados durante a auditoria completa do sistema.

## Como Preencher
Para cada página ou modal auditado, adicione uma seção abaixo seguindo o modelo:

```markdown
### [Nome do Módulo / Página]
- **Data**: DD/MM/AAAA
- **Responsável**: [Nome do Agente/Humano]
- **Status**: [Pendente / Em Correção / Corrigido]

#### Problemas de UI/UX
- [ ] Exemplo: O modal X abre com fundo transparente. (Crítico)
- [ ] Exemplo: O botão Y usa cor hardcoded `bg-blue-500` em vez do token.

#### Problemas de Código
- [ ] Exemplo: O arquivo Z tem mais de 500 linhas e mistura muita lógica de estado.

#### Problemas de Usabilidade / Mobile
- [ ] Exemplo: A tabela X quebra no modo mobile sem scroll horizontal.
```

---

## Registros de Auditoria

### Dashboard (`/dashboard`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: Pendente

#### Problemas de UI/UX
- [ ] O container principal da listagem (`Card` na linha 100 de `AccountsTable.tsx`) não usa `rounded-2xl` (Padrão Guardians).
- [ ] Uso de transparências em hover (`hover:bg-muted/40`) e badges (`bg-destructive/10`), avaliar se estão de acordo com o padrão aceito.

#### Problemas de Código
- [ ] Uso excessivo de `as any` e `any` para burlar a tipagem do Supabase e objetos locais em `page.tsx` e `AccountsTable.tsx`.
- [ ] Cálculos de MRR e ordenação de riscos feitos inline dentro do `map` de renderização em `AccountsTable.tsx` (causa gargalo de performance).
- [ ] Silenciamento de erro (catch vazio) na busca opcional de NPS em `page.tsx`.

#### Problemas de Usabilidade / Mobile
- [ ] Potencial lentidão na renderização da lista devido aos cálculos inline (afeta a fluidez pedida pelo CS).

### Account Detail (`/accounts/[id]`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: Pendente

#### Problemas de UI/UX
- [ ] Uso extensivo de `variant="glass"` em cards do Header em `AccountHeader.tsx`, podendo gerar problemas de legibilidade se o fundo não for adequado (queixa recorrente do usuário sobre transparências).

#### Problemas de Código
- [ ] A página principal (`page.tsx`) faz uma mega query com mais de 10 joins, o que pode ser um gargalo de performance futuro.
- [ ] O componente `AccountHeader.tsx` tem 530 linhas e faz fetch de dados via `useEffect` (NPS, SLA, Histórico) que poderiam vir do servidor.
- [ ] Duplicação de código: `HealthScoreDetailsModal` renderizado duas vezes seguidas em `AccountHeader.tsx` (linhas 504 e 511).
- [ ] Uso excessivo de `any` em tipagens de histórico e retornos de API.

### Account Modals (Adoption, Interaction)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: Pendente

#### Problemas de UI/UX
- [ ] `InteractionDetailModal.tsx` usa cores hardcoded (`slate-50`, `slate-900`, `slate-200`) e não segue os tokens Guardians.
- [ ] Uso de `blur-3xl` no header de `InteractionDetailModal.tsx` (linha 118), avaliar impacto visual.
- [ ] `AdoptionDetailsModal.tsx` usa `backdrop-blur-md` no header do formulário, avaliar se não quebra o padrão.

#### Problemas de Código
- [ ] `AdoptionDetailsModal.tsx` é muito grande (408 linhas) e poderia ser quebrado em sub-componentes para o formulário.
- [ ] Uso de `confirm` nativo em `InteractionDetailModal.tsx` para exclusão, em vez de um modal premium.

### Suporte (`/suporte`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: Pendente

#### Problemas de UI/UX
- [ ] `SuporteClient.tsx` usa `backdrop-blur-md` na tabela (linha 516) e `bg-accent/30` para inputs na área de importação, podendo gerar falta de contraste.
- [ ] `TicketPreviewPanel.tsx` usa cores hardcoded (`slate-900`, `slate-800`, `slate-300`) com transparência na área de insights da IA (linha 278), quebrando o padrão Guardians.

#### Problemas de Código
- [ ] `SuporteClient.tsx` é gigantesco (817 linhas) e viola o princípio de responsabilidade única (KPIs, Filtros, Tabela, Importação).
- [ ] Fetch de dados no cliente usando Supabase diretamente em `TicketPreviewPanel.tsx` (linhas 66-84).
