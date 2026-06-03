export interface Office365Event {
  id: string
  subject: string
  start: string
  end: string
  webLink: string
  isOnlineMeeting: boolean
  isAllDay: boolean
}

export async function getDailyEvents(accessToken: string, targetDate: Date): Promise<Office365Event[]> {
  // Start and end of the specified day
  const startOfDay = new Date(targetDate)
  startOfDay.setHours(0, 0, 0, 0)
  
  const endOfDay = new Date(targetDate)
  endOfDay.setHours(23, 59, 59, 999)

  const startDateTime = startOfDay.toISOString()
  const endDateTime = endOfDay.toISOString()

  // We use the calendarView endpoint which automatically expands recurring events
  const url = `https://graph.microsoft.com/v1.0/me/calendarView?startDateTime=${startDateTime}&endDateTime=${endDateTime}&$select=id,subject,start,end,webLink,isOnlineMeeting,isAllDay&$orderby=start/dateTime`

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      // TimeZone preference: use UTC, we will parse dates on frontend
      Prefer: 'outlook.timezone="UTC"'
    }
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to fetch calendar events: ${error}`)
  }

  const data = await response.json()

  return (data.value || []).map((event: any) => ({
    id: event.id,
    subject: event.subject,
    start: event.start.dateTime + 'Z', // MS Graph returns time without Z when preferred TZ is UTC
    end: event.end.dateTime + 'Z',
    webLink: event.webLink,
    isOnlineMeeting: event.isOnlineMeeting,
    isAllDay: event.isAllDay
  }))
}
