import type { PriceLine, PricingRule, PricingSnapshot } from './types'
import { addMinutes, localDate, localMinute, weekday } from './time'

export const dayType = (date: string): 'weekday' | 'weekend' => [0, 6].includes(weekday(date)) ? 'weekend' : 'weekday'

export function calculatePrice(startAt: string, endAt: string, timeZone: string, rules: PricingRule[]): { total: number; snapshot: PricingSnapshot } {
  const lines: PriceLine[] = []
  let cursor = startAt
  while (new Date(cursor) < new Date(endAt)) {
    const date = localDate(cursor, timeZone)
    const minute = localMinute(cursor, timeZone)
    const rule = rules.find(r => r.dayType === dayType(date) && minute >= r.startMinute && minute < r.endMinute)
    if (!rule) throw new Error(`No price rule for ${date} at ${minute}`)
    const minutes = Math.min(30, (new Date(endAt).getTime() - new Date(cursor).getTime()) / 60000)
    const amount = rule.pricePerHour * minutes / 60
    const previous = lines.at(-1)
    if (previous?.rate === rule.pricePerHour && previous.label === rule.label) { previous.minutes += minutes; previous.amount += amount }
    else lines.push({ label: rule.label, minutes, rate: rule.pricePerHour, amount })
    cursor = addMinutes(cursor, minutes)
  }
  return { total: lines.reduce((sum, l) => sum + l.amount, 0), snapshot: { rules: structuredClone(rules), lines } }
}

export function validatePricingRules(rules: PricingRule[]) {
  for (const type of ['weekday', 'weekend'] as const) {
    const sorted = rules.filter(r => r.dayType === type).sort((a, b) => a.startMinute - b.startMinute)
    if (sorted.some((r, i) => r.startMinute < 0 || r.endMinute > 1440 || r.startMinute >= r.endMinute || (i > 0 && r.startMinute < sorted[i - 1].endMinute))) return false
  }
  return true
}
