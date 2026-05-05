'use client'

import { useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

/**
 * Hook to manage the ticket preview state in the URL search parameters.
 * Synchronizes the open/closed state of the preview panel with the 'preview' query param.
 */
export function usePreviewPanel() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const previewId = searchParams.get('preview')

  const openPreview = useCallback((id: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('preview', id)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  const closePreview = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('preview')
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }, [router, pathname, searchParams])

  return {
    previewId,
    isOpen: !!previewId,
    openPreview,
    closePreview
  }
}
