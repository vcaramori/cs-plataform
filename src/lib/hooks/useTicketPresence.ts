import { useEffect, useState } from 'react'
import { getSupabaseBrowserClient as createClient } from '../supabase/client'

export interface PresenceUser {
  id: string
  email: string
  viewing_at: string
}

/**
 * Tracks and returns other users viewing the same ticket in real-time.
 * Uses Supabase Presence.
 */
export function useTicketPresence(ticketId: string | null, userId: string | null, userEmail: string | null) {
  const [otherViewers, setOtherViewers] = useState<PresenceUser[]>([])
  const supabase = createClient()

  useEffect(() => {
    if (!ticketId || !userId) {
      setOtherViewers([])
      return
    }

    const channel = supabase.channel(`support_presence:${ticketId}`, {
      config: {
        presence: {
          key: userId,
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const activeUsers: PresenceUser[] = []

        Object.values(state).forEach((presences: any) => {
          presences.forEach((p: any) => {
            if (p.id !== userId) {
              activeUsers.push({
                id: p.id,
                email: p.email,
                viewing_at: p.viewing_at
              })
            }
          })
        })

        setOtherViewers(activeUsers)
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
      })
      .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: userId,
            email: userEmail || 'unknown',
            viewing_at: new Date().toISOString()
          })
        }
      })

    return () => {
      channel.unsubscribe()
    }
  }, [ticketId, userId, userEmail, supabase])

  return otherViewers
}
