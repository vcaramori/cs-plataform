# Plano de Auditoria Mestre - CS-Continuum

> **Atenção Agentes**: Este documento serve como guia e alinhamento para a auditoria completa do sistema. O objetivo é mapear débitos técnicos, problemas de design (especialmente transparências) e lacunas de documentação em cada página e modal individualmente.

## Contexto e Princípio Norteador
- **Fase**: Próximos da release.
- **Diretriz**: **Qualidade Acima do Prazo**. Não aceitamos mediocridade.
- **Objetivo**: Mapear todos os problemas de todas as páginas para criar um backlog definitivo de correções.
- **Regra**: Cada página deve ser documentada (manual do usuário) e auditada criticamente.

---

## Critérios de Avaliação

Para cada página ou modal, avalie e documente:

1.  **Qualidade de Código**:
    *   Tamanho e complexidade.
    *   Uso correto de Server/Client Components.
    *   Tratamento de erros e loading.
2.  **Design e UI**:
    *   Consistência com o tema Guardians (tokens de cor).
    *   **Proibido transparências indevidas** em modais e menus.
    *   Responsividade mobile.
3.  **Usabilidade e Experiência do Cliente (CS)**:
    *   Acessibilidade e contraste.
    *   Fluxos intuitivos.
    *   **Performance e Velocidade**: Abertura rápida de modais de log e fluidez no uso diário (dor relatada pelo time de CS).

---

## Mapeamento de Itens para Auditoria (Backlog de Execução)

Cada agente ou equipe pode assumir um ou mais itens desta lista. Ao assumir, marque com `[/]` e quando terminar com `[x]`. Registre os problemas encontrados em `docs/product/master-audit-backlog.md` e crie o manual em `docs/user-manual/`.

| Item | Módulo / Página | Tipo | Status | Responsável |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Dashboard** (`/dashboard`) | Página | `[ ]` | |
| 2 | **Accounts** (`/accounts`) | Módulo | `[ ]` | |
| 3 | **Account Detail** (`/accounts/[id]`) | Página | `[ ]` | |
| 4 | **Account Modals** (Adoption, Contract, Interaction) | Modais | `[ ]` | |
| 5 | **Suporte** (`/suporte`) | Módulo | `[ ]` | |
| 6 | **NPS** (`/nps`) | Módulo | `[ ]` | |
| 7 | **Playbooks** (`/playbooks`) | Módulo | `[ ]` | |
| 8 | **Voice of Customer** (`/voc`) | Módulo | `[ ]` | |
| 9 | **Esforço** (`/esforco`) | Página | `[ ]` | |
| 10 | **Perguntar (IA)** (`/perguntar`) | Página | `[ ]` | |
| 11 | **Admin / Users / Settings** | Vários | `[ ]` | |

---

## Entregas Esperadas por Item
1.  **Registro de Problemas** em `docs/product/master-audit-backlog.md`.
2.  **Manual do Usuário** em `docs/user-manual/[nome-do-modulo].md` (focado em regras de negócio e memória de cálculo).
3.  **Mapeamento do Ícone de Ajuda (?)** para a tela.
