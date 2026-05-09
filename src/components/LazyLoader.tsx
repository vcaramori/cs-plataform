'use client'

import React, { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

interface LazyWrapperProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  moduleName?: string
}

/**
 * Lazy load wrapper com Suspense boundary
 * Usa skeleton como fallback padrão
 */
export function LazyLoader({ children, fallback, moduleName = 'Módulo' }: LazyWrapperProps) {
  return (
    <Suspense fallback={fallback || <SkeletonLoader moduleName={moduleName} />}>
      {children}
    </Suspense>
  )
}

/**
 * Skeleton loader padrão enquanto módulo carrega
 */
export function SkeletonLoader({ moduleName = 'Carregando...' }: { moduleName?: string }) {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-surface-card border border-border-divider animate-pulse" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>

      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-3/4 rounded-lg" />
      </div>

      <p className="text-xs text-content-secondary text-center mt-4">
        {moduleName}...
      </p>
    </div>
  )
}

/**
 * Componente modal skeleton para modais pesados
 */
export function ModalSkeleton() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border-divider">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>

      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 pt-4 border-t border-border-divider">
        <Skeleton className="h-9 w-20 rounded-lg" />
        <Skeleton className="h-9 w-20 rounded-lg" />
      </div>
    </div>
  )
}
