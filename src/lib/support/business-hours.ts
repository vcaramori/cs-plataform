import { toZonedTime, fromZonedTime } from 'date-fns-tz'
import { BusinessHours } from '../supabase/types'

const parseTime = (timeStr: string) => {
  const [h, m] = timeStr.split(':').map(Number)
  return h * 60 + m
}

const getDowFromZoned = (zonedDate: Date): number => {
  // getDay() gives 0-6 (Sun-Sat)
  return zonedDate.getDay()
}

/**
 * Calculates total business minutes between two dates.
 */
export function getBusinessMinutesBetween(start: Date, end: Date, timezone: string, hours: BusinessHours[]): number {
  if (start.getTime() >= end.getTime()) return 0
  
  let current = new Date(start.getTime())
  let totalMinutes = 0
  let safety = 0
  const maxIterations = 365 * 24 * 60 // 1 year of minutes

  // Simple minute-by-minute step is guaranteed accurate and extremely fast (<5ms for a month)
  // We can optimize by jumping if we are outside business hours.
  while (current.getTime() < end.getTime() && safety < maxIterations) {
    const zoned = toZonedTime(current, timezone)
    const dow = getDowFromZoned(zoned)
    const minutesFromMidnight = zoned.getHours() * 60 + zoned.getMinutes()

    const todayHours = hours.find(h => h.dow === dow && h.is_active)
    
    if (!todayHours) {
      // Jump to midnight of next day to save loops
      current = new Date(current.getTime() + (24 * 60 - minutesFromMidnight) * 60000)
    } else {
      const startMin = parseTime(todayHours.start_time)
      const endMin = parseTime(todayHours.end_time)

      if (minutesFromMidnight < startMin) {
        // Jump to start of business day
        current = new Date(current.getTime() + (startMin - minutesFromMidnight) * 60000)
      } else if (minutesFromMidnight >= endMin) {
        // Jump to midnight of next day
        current = new Date(current.getTime() + (24 * 60 - minutesFromMidnight) * 60000)
      } else {
        // We are inside business hours.
        // We can either count 1 by 1 or jump to end of business day or end of period.
        const zonedEnd = toZonedTime(end, timezone)
        const isSameDayEnd = zoned.getFullYear() === zonedEnd.getFullYear() && 
                             zoned.getMonth() === zonedEnd.getMonth() && 
                             zoned.getDate() === zonedEnd.getDate()
                             
        let minutesToJump = endMin - minutesFromMidnight
        if (isSameDayEnd) {
          const endMinutesFromMidnight = zonedEnd.getHours() * 60 + zonedEnd.getMinutes()
          minutesToJump = Math.min(minutesToJump, endMinutesFromMidnight - minutesFromMidnight)
        }
        
        // Failsafe jump of at least 1 minute
        if (minutesToJump <= 0) minutesToJump = 1

        totalMinutes += minutesToJump
        current = new Date(current.getTime() + minutesToJump * 60000)
      }
    }
    safety++
  }

  return totalMinutes
}

/**
 * Calculates the exact future Date when a deadline hits, considering only business hours.
 */
export function calculateDeadline(openedAt: Date, offsetMinutes: number, timezone: string, hours: BusinessHours[]): Date {
  if (offsetMinutes <= 0) return new Date(openedAt.getTime())

  let current = new Date(openedAt.getTime())
  let remaining = offsetMinutes
  let safety = 0
  const maxIterations = 365 * 24 * 60

  while (remaining > 0 && safety < maxIterations) {
    const zoned = toZonedTime(current, timezone)
    const dow = getDowFromZoned(zoned)
    const minutesFromMidnight = zoned.getHours() * 60 + zoned.getMinutes()

    const todayHours = hours.find(h => h.dow === dow && h.is_active)

    if (!todayHours) {
      current = new Date(current.getTime() + (24 * 60 - minutesFromMidnight) * 60000)
    } else {
      const startMin = parseTime(todayHours.start_time)
      const endMin = parseTime(todayHours.end_time)

      if (minutesFromMidnight < startMin) {
        current = new Date(current.getTime() + (startMin - minutesFromMidnight) * 60000)
      } else if (minutesFromMidnight >= endMin) {
        current = new Date(current.getTime() + (24 * 60 - minutesFromMidnight) * 60000)
      } else {
        // Can we exhaust all remaining minutes today?
        const canSqueezeToday = (minutesFromMidnight + remaining) <= endMin
        if (canSqueezeToday) {
          current = new Date(current.getTime() + remaining * 60000)
          remaining = 0
        } else {
          // Consume until end of today
          const consumed = endMin - minutesFromMidnight
          remaining -= consumed
          current = new Date(current.getTime() + consumed * 60000)
        }
      }
    }
    safety++
  }

  return current
}

export function calculateAttentionDeadline(openedAt: Date, totalSlaMinutes: number, thresholdPct: number, timezone: string, hours: BusinessHours[]): Date {
  const safeThreshold = Math.max(0, Math.min(100, thresholdPct)) // Ensure 0-100
  // e.g., if threshold is 25%, attention triggers at 75% of the time elapsed
  const elapsedToTrigger = totalSlaMinutes * ( (100 - safeThreshold) / 100 )
  return calculateDeadline(openedAt, elapsedToTrigger, timezone, hours)
}
