import { PageContainer } from "@/components/layout/PageContainer"
import { ModuleHeader } from "@/components/shared/guardians/ModuleHeader"
import RenewalPipelineSection from "../dashboard/components/RenewalPipelineSection"
import { RenewalsSummary } from "./RenewalsSummary"

export const dynamic = 'force-dynamic'

export default function RenovacoesPage() {
  return (
    <PageContainer>
      <ModuleHeader
        title="Cockpit de Renovações"
        subtitle="Pipeline de renovação do portfólio — priorize por prazo e receita em risco"
        iconName="CalendarClock"
      />
      <RenewalsSummary />
      <RenewalPipelineSection />
    </PageContainer>
  )
}
