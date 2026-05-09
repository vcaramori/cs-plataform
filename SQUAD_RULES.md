# SQUAD RULES - PROTOCOLO ZERO MEDIOCRIDADE

> **Atenção todos os Agentes de IA (Claude, Codex, Gemini, etc.)**: Este arquivo define as regras inegociáveis de qualidade, colaboração e documentação para este projeto. O descumprimento destas regras é considerado uma falha grave.

---

## 1. Princípio Norteador: Qualidade Acima do Prazo
- **Não aceitamos mediocridade.** É preferível renegociar o prazo com o cliente a entregar uma funcionalidade com falhas básicas, falta de acabamento ou quebra de padrões.
- O código e a interface devem estar **impecáveis** antes de qualquer entrega ou release.

## 2. Modo Debate Obrigatório (Party Mode)
- **Nenhuma feature deve ser desenvolvida sem avaliação crítica de todos os papéis.**
- Antes de iniciar o desenvolvimento, os agentes devem simular ou envolver as perspectivas de:
    *   **Arquiteto**: Qualidade de código, padrões, performance.
    *   **UX Designer**: Consistência visual, acessibilidade, ausência de transparências indevidas.
    *   **QA**: Testabilidade, cenários de erro, regressão visual.
    *   **PM/PO**: Valor de negócio, regras de negócio e aderência ao manual.
- **Sempre critiquem uns aos outros** para encontrar a melhor solução. Concordância passiva é proibida.

## 3. Documentação e Ajuda Contextual
- **Documentação não é opcional.** Toda tela ou funcionalidade criada ou alterada deve:
    *   Ter seu manual de usuário atualizado ou criado em `docs/user-manual/` (focado no usuário, regras de negócio e memória de cálculo).
    *   Prever a inclusão do ícone de ajuda `(?)` para o usuário acessar o manual contextual.
- A documentação deve ser feita em paralelo ou antes do desenvolvimento final, nunca depois como um "puxadinho".
- **Foco em Performance**: Garantir que as ações críticas do usuário (como abrir modais de log pós-call) sejam rápidas e fluidas, conforme cobrado pelos especialistas de CS.

## 4. Auditoria de UI/UX Rigorosa
- Proibido o uso de transparências (`bg-transparent` ou opacidades baixas) que quebrem o contraste e a acessibilidade em modais, sidebars e menus.
- Todos os componentes devem usar os tokens de cor do tema Guardians (em `globals.css`) e nunca cores hardcoded.

---
*Assinado pela Squad em 09/05/2026.*
