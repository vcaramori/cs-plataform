'use client'

import Script from 'next/script'

interface Props {
  programKey: string
  userEmail: string
  userId?: string
}

export function NPSTestLoader({ programKey, userEmail, userId }: Props) {
  const origin = typeof window !== 'undefined' ? window.location.origin : ''

  return (
    <Script
      src="/embed.js"
      strategy="afterInteractive"
      data-program-key={programKey}
      data-email={userEmail}
      data-user-id={userId || ''}
      data-base-url={origin}
      data-force="true"
    />
  )
}
