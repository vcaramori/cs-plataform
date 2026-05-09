# Backlog de Auditoria Mestre 2.0 — Segunda Camada de Avaliação

Este arquivo centraliza as descobertas da segunda camada de auditoria (Avaliação 2.0), realizada após as correções do outro time. O foco aqui é **Qualidade Máxima e Irrestrita**.

---

## 📊 Registros de Auditoria v2.0

### Dashboard (`/dashboard`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🔴 Crítico (Problemas de Código e UI)

#### Problemas de UI/UX
- [ ] **Cores Hardcoded**: Em `AccountsTable.tsx` (linhas 79-81), as cores dos segmentos (Indústria, MRO, Varejo) estão hardcoded (`#2ba09d`, `#f8b967`, `#d85d4b`). Deveriam usar tokens do tema ou classes do Guardians.
- [ ] **Border Radius Inconsistente**: Uso de `rounded-xl` e `rounded-lg` em botões e inputs de `AccountsTable.tsx`, quando o padrão Guardians (segundo o plano mestre) prioriza `rounded-2xl` para containers e elementos principais.

#### Problemas de Código
- [ ] **Uso abusivo de `as any`**: Persiste no arquivo `page.tsx` (linhas 67, 87, 130) e em `AccountsTable.tsx` (linha 105, 216). Isso quebra a segurança de tipos do TypeScript.
- [ ] **Bloco `catch` vazio**: Em `page.tsx` (linha 84), o erro de busca do NPS é silenciado sem log.
- [ ] **Cálculos inline complexos**: Lógica de MRR e status de risco calculados diretamente no corpo do Server Component (`page.tsx`), dificultando testes unitários.

---

### Accounts (`/accounts/[id]`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🟠 Alto (Problemas de Código e Glassmorphism)

#### Problemas de UI/UX
- [ ] **Overuse de Glassmorphism**: O arquivo `AccountDetailPageClient.tsx` usa `variant="glass"` em cards (linhas 84, 308). Conforme o plano mestre, o uso excessivo de transparências deve ser reduzido para garantir contraste e legibilidade.
- [ ] **Cores Semânticas Hardcoded**: Uso de cores específicas de status (`emerald-700`, `amber-700`, etc.) inline em vez de usar os tokens puros do Guardians para manter a consistência do tema escuro/claro.

#### Problemas de Código
- [ ] **Invasão de `any`**: O arquivo `page.tsx` e `AccountDetailPageClient.tsx` usam `any` em praticamente todas as props e loops. Falta tipagem forte baseada no esquema do banco.
- [ ] **Query Monstro**: A query em `page.tsx` (linhas 11-41) faz 14 joins de uma vez. Isso é um débito técnico grave que pode degradar a performance conforme a base de dados cresce.
- [ ] **Fetch Inline**: `AccountHeader.tsx` mantém 3 chamadas `fetch` inline para APIs internas (linhas 42, 53, 65).

---

### Modais de Accounts
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🔴 Crítico (Cores Hardcoded e Transparências)

#### Problemas de UI/UX
- [ ] **Festival de Cores Hardcoded**: Os modais `InteractionDetailModal.tsx` e `NPSDetailModal.tsx` usam cores hardcoded como `#2d3558`, `slate-800` e `slate-900` diretamente nas classes do Tailwind, ignorando os tokens do tema.
- [ ] **Transparências Indevidas**: Uso de opacidade como `dark:bg-slate-800/50` e `bg-indigo-50/30` que quebram o contraste e a legibilidade do texto.

#### Problemas de Código
- [ ] **Falta de Tipagem**: Uso de `any` em props (como no `render` do `NPSDetailModal.tsx`).

---

### Suporte (`/suporte`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🟠 Alto (Invasão de `any` e Glassmorphism)

#### Problemas de UI/UX
- [ ] **Uso de Glassmorphism**: O arquivo `SuporteTable.tsx` usa `backdrop-blur-md` e `bg-surface-background/50` (linhas 31, 34). Deve-se avaliar se isso prejudica a legibilidade.
- [ ] **Configurações Locais de Cores**: O arquivo `TicketListRow.tsx` define cores de status e prioridade inline (linhas 23-36) usando opacidade (`bg-destructive/10`), em vez de centralizar no design system ou usar o `StatusBadgeGuard` para tudo.

#### Problemas de Código
- [ ] **Invasão de `any`**: O arquivo `SuporteClient.tsx` (que foi reduzido de 817 para 398 linhas, parabéns!) ainda contém muitos usos de `any` em funções de ordenação e handlers (linhas 22, 23, 24, 75, etc.).
- [ ] **Uso de `as any`**: Em `TicketListRow.tsx` (linha 71) ao passar o status para o `StatusBadgeGuard`.

---

### NPS (`/nps`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🔴 Crítico (Arquivo Gigante e Invasão de `any`)

#### Problemas de UI/UX
- [ ] **Monolito de Código**: O arquivo `NPSDashboardClient.tsx` possui 646 linhas e contém subcomponentes inteiros declarados inline (como `ResponseDetailDialog` e `ResponseCarousel`). Deveria ser quebrado para facilitar a manutenção.
- [ ] **Uso de Transparências**: Uso de `bg-surface-background/50` (linha 383) e `bg-plannera-orange/5` (linha 424) que podem gerar inconsistências de contraste.

#### Problemas de Código
- [ ] **Invasão de `any`**: Uso massivo de `any` em props, estados e iterações (linhas 79, 141, 181, 219, 221, 227, etc.). Falta tipagem forte.

---

### Playbooks (`/playbooks`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🔴 Crítico (Arquivo Legado no Builder)

#### Problemas de UI/UX
- [ ] **Uso de Glassmorphism**: O arquivo `playbooks/page.tsx` usa `variant="glass"` nas linhas 37 e 71.
- [ ] **Cores Hardcoded no Builder**: O arquivo `playbooks/builder/page.tsx` é totalmente legado. Usa cores como `white`, `slate-50`, `blue-50`, `amber-50` e `slate-900` diretamente nas classes do Tailwind.
- [ ] **Falta de Componentes Guardians**: O Builder não usa os componentes padronizados como `Card` e `Button` do projeto.

#### Problemas de Código
- [ ] **Uso de `any`**: O arquivo `playbooks/page.tsx` usa `any` na linha 36.
- [ ] **Instanciação Direta do Supabase**: O arquivo `playbooks/builder/page.tsx` cria o cliente Supabase diretamente (linha 4) em vez de usar os helpers centralizados do projeto.

---

### Voice of Customer (`/voc`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🔴 Crítico (Cores Hardcoded e Instanciação do Supabase)

#### Problemas de UI/UX
- [ ] **Cores Hardcoded**: O arquivo `VocBoardClient.tsx` usa `#3b82f6` no gráfico e `text-emerald-600` nos cards.
- [ ] **Falta de Componentes Guardians**: O arquivo `page.tsx` não usa os componentes padronizados de layout.

#### Problemas de Código
- [ ] **Instanciação Direta do Supabase**: O arquivo `page.tsx` cria o cliente Supabase diretamente (linha 7) em vez de usar os helpers centralizados do projeto.
- [ ] **Uso de `any`**: Uso de `any` em iterações no `VocBoardClient.tsx` (linhas 72, 92, 114).

---

### Esforço (`/esforco`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🟡 Atenção (Uso de `any` e Glassmorphism)

#### Problemas de UI/UX
- [ ] **Uso de Glassmorphism**: O arquivo `EsforcoChart.tsx` usa `variant="glass"` na linha 22.
- [ ] **Uso de Transparências**: Uso de `bg-surface-background/50` (linha 115 do chart) e `bg-primary/10` com blur (linha 29 da page).

#### Problemas de Código
- [ ] **Uso de `any`**: Uso de `as any` em `page.tsx` (linha 45) e `any` em `EsforcoClient.tsx` (linhas 104 e 160).

---

### Perguntar (`/perguntar`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🟡 Atenção (Abuso de Glassmorphism)

#### Problemas de UI/UX
- [ ] **Abuso de Glassmorphism**: O arquivo `PerguntarClient.tsx` faz uso excessivo de `backdrop-blur` e opacidades (linhas 120, 122, 171, 199, 247, 301, 321). Devemos avaliar se isso não prejudica a legibilidade e a performance.
- [ ] **Monolito de Chat**: O arquivo possui 364 linhas e gerencia todo o estado do chat. Poderia ser quebrado em `MessageList` e `ChatInput`.

#### Problemas de Código
- [ ] **Tipagem Adequada**: O arquivo está bem tipado (usa `Message`, `Source`, `Account`), o que é um ponto positivo!

---

### Admin / Users / Settings (`/admin`, `/users`, `/settings`)
- **Data**: 09/05/2026
- **Responsável**: Antigravity (Modo Debate)
- **Status**: 🟡 Atenção (Arquivos Esqueleto e Transparências)

#### Problemas de UI/UX
- [ ] **Arquivo Esqueleto (Admin)**: O arquivo `admin/page.tsx` é apenas um esqueleto ("Sistema em Desenvolvimento").
- [ ] **Quebra de Padrão (Admin)**: Usa `rounded-lg` na linha 34 em vez do padrão `rounded-2xl` do Guardians para cards grandes.
- [ ] **Uso de Transparências com Blur**: Uso de `bg-primary/10` com blur em `admin/page.tsx` (linha 21), `users/page.tsx` (linha 82) e `settings/features/page.tsx` (linha 47).

#### Problemas de Código
- [ ] **Tamanho do Arquivo (Users)**: O arquivo `users/page.tsx` possui 207 linhas. Não é crítico, mas poderia ser quebrado extraindo o formulário ou a lista.









