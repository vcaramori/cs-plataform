# Epics and Stories (CS-Continuum Roadmap)

Este documento traduz a especificação do produto (`specification.md`) no formato oficial de Épicos e Histórias de Usuário, para que as ferramentas de inteligência artificial (como a Amelia e o `bmad-sprint-planning`) consigam ler e gerenciar o andamento do projeto automaticamente.

## Epic 1: Dashboard
Baseado em `01-dashboard.md`
### Story 1.1: KPI Strip (Métricas)
Como executivo, quero ver o total de LOGOs, MRR, Health Médio, Risco e NPS consolidado.
### Story 1.2: Accounts Table Resumo
Como usuário, quero ver uma lista resumida das contas diretamente no dashboard.

## Epic 2: Accounts (LOGOs)
Baseado em `02-accounts.md`
### Story 2.1: Lista de Contas
Como CSM, quero visualizar todas as minhas contas com seus status atuais.
### Story 2.2: Detalhes da Conta
Como CSM, quero entrar nos detalhes da conta para ver contratos, health score e histórico.
### Story 2.3: Modal de Interações Estratégicas
Como CSM, quero visualizar e editar os detalhes (checklist, contatos, datas) das reuniões estratégicas a partir da timeline para manter o registro preciso.

## Epic 3: NPS Hub
Baseado em `03-nps.md`
### Story 3.1: Dashboard NPS
Como head de CS, quero analisar as avaliações de NPS segmentadas.

## Epic 4: Suporte
Baseado em `04-suporte.md`
### Story 4.1: Gestão de Tickets
Como analista de suporte, quero listar, responder e gerenciar o ciclo de vida dos tickets.

## Epic 5: AI RAG (Perguntar)
Baseado em `05-perguntar.md`
### Story 5.1: Chatbot Contextual
Como CSM, quero fazer perguntas em linguagem natural e receber respostas baseadas nos dados da minha carteira.

## Epic 6: Esforço & Time Tracking
Baseado em `06-esforco.md`
### Story 6.1: Lançamento de Horas
Como CSM, quero registrar meu esforço nas atividades para medição de rentabilidade.

## Epic 7: Settings
Baseado em `07-settings.md`
### Story 7.1: Configurações Globais
Como admin, quero configurar SLAs, HH e features globais do sistema.

## Epic 8: Usuários e Autenticação
Baseado em `08-users.md` e `09-login.md`
### Story 8.1: Login Auth
Como usuário, quero me autenticar com segurança (Supabase JWT).
### Story 8.2: Gestão de Equipe
Como admin, quero convidar e gerenciar os CSMs da plataforma.

## Wave 4: Automação e Inteligência Proativa (Próxima Fase)
Baseado no direcionamento estratégico.

### Epic 9: Automação de Playbooks (Jornadas)
### Story 9.1: Gatilhos de Health Score
Como CSM, quero receber automaticamente tarefas/playbooks quando o Health Score de uma conta cair abaixo do limite aceitável.
### Story 9.2: Check-in Automatizado
Como CSM, quero que o sistema dispare e-mails de check-in automáticos baseados em eventos do ciclo de vida do cliente.

### Epic 10: IA Preditiva de Risco e Churn
### Story 10.1: Análise de Sentimento em Background
Como head de CS, quero que o sistema analise as interações e tickets passados para prever a probabilidade de Churn usando IA.
### Story 10.2: Alertas de Risco Inteligentes
Como CSM, quero ser notificado proativamente pela IA quando um padrão de comunicação indicar insatisfação antes mesmo do NPS ou Health Score cair.
