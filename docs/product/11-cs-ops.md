# 11. CS Ops Cockpit

> Especificação funcional do painel de operações de Customer Success (Wave 6).

## Visão Geral
O Cockpit de CS Ops permite que a liderança e os CSMs acompanhem a carga de trabalho, a distribuição da carteira e os riscos pendentes em um único lugar.

## Regras de Negócio

### 1. Perfil de CSM e Capacity Planning
- **Inclusão de Admin**: Todo usuário com a role `admin` é considerado um CSM potencial e é incluído nos cálculos de capacidade, métricas e rebalanceamento, além das roles `csm`, `csm_senior` e `account_manager`.
- **Cálculo de Capacidade**: Baseado no número de contas ativas e no esforço registrado.

### 2. Contas sem CSM (Órfãs)
- O sistema identifica contas que não possuem um `csm_owner_id` válido (nulo ou apontando para um perfil inexistente).
- Estas contas são exibidas na **Fila de Trabalho** como "Conta sem CSM válido" para ação imediata de reatribuição.

### 3. Fila de Trabalho (Atenção Necessária)
Consolida itens que requerem ação:
- Contas com Health Score crítico (< 40).
- Playbooks em atraso.
- Riscos abertos de alta severidade.
- Contas sem CSM válido.

## Interface
- **Tabs**: Cockpit (Visão Geral), Capacity Planning, Rebalancer.
- **Fila de Trabalho**: Cards com ícones, cores e links para ação rápida.
