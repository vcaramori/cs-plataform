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
