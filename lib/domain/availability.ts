import type { Block, Booking, Hold, OperatingHours } from './types'
import { addMinutes, localDate, weekday, zonedDateTime } from './time'

export const rangesConflict = (aStart: string, aEnd: string, bStart: string, bEnd: string) => new Date(aStart) < new Date(bEnd) && new Date(aEnd) > new Date(bStart)
export const isHoldActive = (hold: Hold, now = new Date()) => new Date(hold.expiresAt) > now

export function conflictReason(startAt: string, endAt: string, bookings: Booking[], blocks: Block[], holds: Hold[], now = new Date(), excludeHoldId?: string) {
  if (bookings.some(b => b.status === 'confirmed' && rangesConflict(startAt, endAt, b.startAt, b.endAt))) return 'booked'
  if (blocks.some(b => rangesConflict(startAt, endAt, b.startAt, b.endAt))) return 'blocked'
  if (holds.some(h => h.id !== excludeHoldId && isHoldActive(h, now) && rangesConflict(startAt, endAt, h.startAt, h.endAt))) return 'hold'
  return null
}

export function withinOperatingHours(startAt: string, endAt: string, timeZone: string, hours: OperatingHours) {
  const date = localDate(startAt, timeZone)
  const day = hours[weekday(date)]
  if (!day || day.closed) return false
  const open = zonedDateTime(date, day.openMinute, timeZone)
  const close = zonedDateTime(date, day.closeMinute, timeZone)
  return new Date(startAt) >= new Date(open) && new Date(endAt) <= new Date(close)
}

export function generateSlots(date: string, timeZone: string, hours: OperatingHours, interval: number) {
  const day = hours[weekday(date)]
  if (!day || day.closed) return []
  const slots: string[] = []
  for (let minute = day.openMinute; minute < day.closeMinute; minute += interval) slots.push(zonedDateTime(date, minute, timeZone))
  return slots
}

export function validDuration(startAt: string, duration: number, timeZone: string, hours: OperatingHours, min: number, max: number) {
  if (duration < min || duration > max) return false
  return withinOperatingHours(startAt, addMinutes(startAt, duration), timeZone, hours)
}
