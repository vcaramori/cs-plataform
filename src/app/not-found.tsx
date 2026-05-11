import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50 text-slate-900">
      <div className="text-center space-y-6">
        <h1 className="text-6xl font-bold text-slate-900">404</h1>
        <h2 className="text-2xl font-semibold">Página não encontrada</h2>
        <p className="text-slate-600 max-w-md">
          O recurso que você está procurando não existe ou você não tem permissão para acessá-lo.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white shadow transition-colors hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-700 disabled:pointer-events-none disabled:opacity-50"
        >
          Voltar para o Início
        </Link>
      </div>
    </div>
  )
}
