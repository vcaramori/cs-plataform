# Epics and Stories (CS-Continuum Roadmap)

Este documento traduz a especificaÃ§Ã£o do produto (`specification.md`) no formato oficial de Ã‰picos e HistÃ³rias de UsuÃ¡rio, para que as ferramentas de inteligÃªncia artificial (como a Amelia e o `bmad-sprint-planning`) consigam ler e gerenciar o andamento do projeto automaticamente.

## Epic 1: Dashboard
Baseado em `01-dashboard.md`
### Story 1.1: KPI Strip (MÃ©tricas)
Como executivo, quero ver o total de LOGOs, MRR, Health MÃ©dio, Risco e NPS consolidado.
### Story 1.2: Accounts Table Resumo
Como usuÃ¡rio, quero ver uma lista resumida das contas diretamente no dashboard.

## Epic 2: Accounts (LOGOs)
Baseado em `02-accounts.md`
### Story 2.1: Lista de Contas
Como CSM, quero visualizar todas as minhas contas com seus status atuais.
### Story 2.2: Detalhes da Conta
Como CSM, quero entrar nos detalhes da conta para ver contratos, health score e histÃ³rico.
### Story 2.3: Modal de InteraÃ§Ãµes EstratÃ©gicas
Como CSM, quero visualizar e editar os detalhes (checklist, contatos, datas) das reuniÃµes estratÃ©gicas a partir da timeline para manter o registro preciso.

## Epic 3: NPS Hub
Baseado em `03-nps.md`
### Story 3.1: Dashboard NPS
Como head de CS, quero analisar as avaliaÃ§Ãµes de NPS segmentadas.

## Epic 4: Suporte
Baseado em `04-suporte.md`
### Story 4.1: GestÃ£o de Tickets
Como analista de suporte, quero listar, responder e gerenciar o ciclo de vida dos tickets.

### Story 4.2: Preview Inline de Tickets (Triagem Rápida)
Como CSM, quero clicar em um ticket na lista e ver seus detalhes e ações em um painel lateral, para fazer a triagem rápida sem sair da lista de tickets.

### Story 4.3: Detecção de Colisão em Tempo Real
Como CSM, quero ver se outro colega está visualizando o mesmo ticket que eu, para evitar respostas duplicadas e conflitos.

### Story 4.4: Urgency Scoring Automatizado (IA)
Como CSM, quero que o sistema classifique automaticamente a urgência dos tickets usando IA, para que eu possa priorizar melhor meu trabalho.

### Story 4.5: Reabertura Automática de Tickets
Como analista, quero que tickets fechados sejam reabertos automaticamente quando o cliente responder, para garantir a continuidade do atendimento.

## Epic 5: AI RAG (Perguntar)
Baseado em `05-perguntar.md`
### Story 5.1: Chatbot Contextual
Como CSM, quero fazer perguntas em linguagem natural e receber respostas baseadas nos dados da minha carteira.

## Epic 6: EsforÃ§o & Time Tracking
Baseado em `06-esforco.md`
### Story 6.1: LanÃ§amento de Horas
Como CSM, quero registrar meu esforÃ§o nas atividades para mediÃ§Ã£o de rentabilidade.

## Epic 7: Settings
Baseado em `07-settings.md`
### Story 7.1: ConfiguraÃ§Ãµes Globais
Como admin, quero configurar SLAs, HH e features globais do sistema.

## Epic 8: UsuÃ¡rios e AutenticaÃ§Ã£o
Baseado em `08-users.md` e `09-login.md`
### Story 8.1: Login Auth
Como usuÃ¡rio, quero me autenticar com seguranÃ§a (Supabase JWT).
### Story 8.2: GestÃ£o de Equipe
Como admin, quero convidar e gerenciar os CSMs da plataforma.

## Wave 4: AutomaÃ§Ã£o e InteligÃªncia Proativa (PrÃ³xima Fase)
Baseado no direcionamento estratÃ©gico.

### Epic 9: AutomaÃ§Ã£o de Playbooks (Jornadas)
### Story 9.1: Gatilhos de Health Score
Como CSM, quero receber automaticamente tarefas/playbooks quando o Health Score de uma conta cair abaixo do limite aceitÃ¡vel.
### Story 9.2: Check-in Automatizado
Como CSM, quero que o sistema dispare e-mails de check-in automÃ¡ticos baseados em eventos do ciclo de vida do cliente.

### Epic 10: IA Preditiva de Risco e Churn
### Story 10.1: AnÃ¡lise de Sentimento em Background
Como head de CS, quero que o sistema analise as interaÃ§Ãµes e tickets passados para prever a probabilidade de Churn usando IA.
### Story 10.2: Alertas de Risco Inteligentes
Como CSM, quero ser notificado proativamente pela IA quando um padrÃ£o de comunicaÃ§Ã£o indicar insatisfaÃ§Ã£o antes mesmo do NPS ou Health Score cair.

## Epic 11: Governança Comercial Centralizada (Desacoplada)
### Story 11.1: Entidade Governança
Como CSM, quero gerenciar descontos e multas de forma independente dos contratos para maior flexibilidade comercial.
### Story 11.2: Regras Globais vs Específicas
Como CSM, quero poder aplicar uma regra de governança a toda a conta ou a um contrato específico.
