'use client'

import { useState, useEffect } from 'react'
import { Office365CalendarWidget } from './Office365CalendarWidget'
import { createClient } from '@supabase/supabase-js'

// Need a simple way to fetch CSMs for the manager.
// We'll use a basic fetch to a new endpoint or just supabase directly if we have anon key.
// But it's easier to pass the CSM list from the server component.

interface Profile {
  id: string
  full_name: string
}

interface Props {
  isLeadership: boolean
  csms: Profile[] // passed from server
}

export function Office365CalendarContainer({ isLeadership, csms }: Props) {
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  return (
    <div className="flex flex-col gap-4 w-full">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content flex items-center gap-2">
          Agenda do Dia
        </h2>
        
        {isLeadership && csms.length > 0 && (
          <select
            className="text-xs border border-accent/20 rounded-md bg-accent/5 px-2 py-1 text-content-secondary outline-none focus:border-primary/50"
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
          >
            <option value="">Minha Agenda</option>
            {csms.map(csm => (
              <option key={csm.id} value={csm.id}>
                {csm.full_name || 'Usuário'}
              </option>
            ))}
          </select>
        )}
      </div>

      <Office365CalendarWidget userId={selectedUserId || undefined} />
    </div>
  )
}
