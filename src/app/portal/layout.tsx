import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Portal do Cliente',
  description: 'Acompanhe seus chamados e indicadores de suporte',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="dark">
      <div className="min-h-screen bg-surface-background text-content-primary transition-colors duration-300">
        {children}
      </div>
    </div>
  )
}
