'use client'

import React from 'react'
import { AlertTriangle, Home, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: React.ReactNode
  moduleName?: string
  fallback?: React.ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName || 'Module'} error:`, error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="flex flex-col items-center justify-center min-h-[400px] gap-6 p-8 text-center">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            <div className="space-y-2 max-w-md">
              <h2 className="text-lg font-bold text-content-primary">
                Erro ao carregar {this.props.moduleName || 'este módulo'}
              </h2>
              <p className="text-sm text-content-secondary">
                {this.state.error?.message || 'Um erro inesperado ocorreu. Tente recarregar a página.'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.history.back()}
                className="gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
              <Button
                size="sm"
                onClick={this.handleReset}
                className="gap-2 bg-destructive hover:bg-destructive/90"
              >
                <Home className="w-4 h-4" /> Recarregar
              </Button>
            </div>
          </div>
        )
      )
    }

    return this.props.children
  }
}
