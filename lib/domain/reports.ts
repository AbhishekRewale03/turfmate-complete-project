import type { Booking } from './types'
import { localDate, localMinute } from './time'

export function calculateReports(bookings: Booking[], timeZone: string, today: string) {
  const active = bookings.filter(b => b.status === 'confirmed')
  const month = today.slice(0, 7)
  const todayBookings = active.filter(b => localDate(b.startAt, timeZone) === today)
  const monthBookings = active.filter(b => localDate(b.startAt, timeZone).startsWith(month))
  const weekStart = new Date(`${today}T12:00:00Z`); weekStart.setUTCDate(weekStart.getUTCDate() - 6)
  const weekBookings = active.filter(b => localDate(b.startAt, timeZone) >= weekStart.toISOString().slice(0, 10) && localDate(b.startAt, timeZone) <= today)
  const revenue = (items: Booking[]) => items.reduce((s, b) => s + b.paidAmount, 0)
  const outstanding = active.reduce((s, b) => s + Math.max(0, b.finalPrice - b.paidAmount), 0)
  const counts = new Map<number, number>()
  active.forEach(b => { const h = Math.floor(localMinute(b.startAt, timeZone) / 60); counts.set(h, (counts.get(h) ?? 0) + 1) })
  const peakHour = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
  const occupancy = Math.min(100, Math.round(todayBookings.reduce((s, b) => s + b.durationMinutes, 0) / (20 * 60) * 100))
  return { todayRevenue: revenue(todayBookings), weekRevenue: revenue(weekBookings), monthRevenue: revenue(monthBookings), monthlyBookings: monthBookings.length, occupancy, outstanding, online: active.filter(b => b.source === 'online').length, manual: active.filter(b => b.source === 'manual').length, peakHour }
}
