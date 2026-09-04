import { calculatePrice } from '../domain/pricing'
import { addMinutes, datePlus, toDateInput, zonedDateTime } from '../domain/time'
import type { Booking, OperatingHours, PricingRule, TenantData } from '../domain/types'

const weekdayRates = [900, 700, 900, 1200, 900]
const weekendRates = [1200, 900, 1100, 1500, 1200]
const bands = [[0, 120, 'Late night'], [360, 960, 'Daytime'], [960, 1140, 'Evening'], [1140, 1380, 'Prime time'], [1380, 1440, 'Late night']] as const
const rules = (prefix: string): PricingRule[] => ['weekday', 'weekend'].flatMap((kind, k) => bands.map((b, i) => ({ id: `${prefix}-${kind}-${i}`, label: b[2], dayType: kind as 'weekday' | 'weekend', startMinute: b[0], endMinute: b[1], pricePerHour: (k ? weekendRates : weekdayRates)[i] })))
const hours: OperatingHours = Object.fromEntries(Array.from({ length: 7 }, (_, day) => [day, { closed: false, openMinute: 360, closeMinute: 1560 }]))

function booking(tenantId: string, turfId: string, id: string, name: string, phone: string, date: string, minute: number, duration: number, source: 'online' | 'manual', paidRatio: number, pricingRules: PricingRule[]): Booking {
  const startAt = zonedDateTime(date, minute, 'Asia/Kolkata')
  const endAt = addMinutes(startAt, duration)
  const price = calculatePrice(startAt, endAt, 'Asia/Kolkata', pricingRules)
  const paidAmount = Math.round(price.total * paidRatio)
  return { id, tenantId, turfId, customerName: name, phone, startAt, endAt, durationMinutes: duration, status: 'confirmed', source, calculatedPrice: price.total, finalPrice: price.total, priceOverridden: false, pricingSnapshot: price.snapshot, paidAmount, paymentStatus: paidAmount >= price.total ? 'paid' : paidAmount > 0 ? 'advance' : 'unpaid', paymentMethod: source === 'online' ? 'Demo online' : 'Pay at venue', createdAt: new Date().toISOString() }
}

function tenant(seed: { id: string; slug: string; business: string; short: string; owner: string; locality: string; address: string; phone: string; initials: string }): TenantData {
  const today = toDateInput()
  const pricingRules = rules(seed.id)
  const turfId = `turf-${seed.id}`
  return {
    tenant: { id: seed.id, slug: seed.slug, businessName: seed.business, ownerName: seed.owner, status: 'active', plan: 'demo', createdAt: new Date().toISOString() },
    turf: { id: turfId, tenantId: seed.id, name: seed.business, shortName: seed.short, timezone: 'Asia/Kolkata', address: seed.address, locality: seed.locality, mapUrl: `https://maps.google.com/?q=${encodeURIComponent(seed.address)}`, phone: seed.phone, whatsapp: seed.phone, sports: ['Football', 'Cricket'], amenities: ['Floodlights', 'Parking', 'Changing room'], publicSlug: seed.slug, initials: seed.initials, brand: { primary: '#173f31', accent: '#d4f36b' } },
    pricingRules, operatingHours: structuredClone(hours),
    settings: { paymentMode: 'fixed', advanceValue: 500, minDurationMinutes: 60, maxDurationMinutes: 180, slotIntervalMinutes: 60, cancellationEnabled: true, cancellationCutoffHours: 6, bookingWindowDays: 30, holdDurationMinutes: 10 },
    bookings: [booking(seed.id, turfId, `TM-${seed.initials}-1042`, 'Arjun Mehta', '9876543210', today, 1080, 120, 'online', .28, pricingRules), booking(seed.id, turfId, `TM-${seed.initials}-1043`, 'Rohan Sharma', '9812345678', datePlus(today, 1), 1260, 60, 'manual', 0, pricingRules)],
    holds: [], blocks: [],
  }
}

export const createSeedData = (): Record<string, TenantData> => ({
  arena11: tenant({ id: 'arena11', slug: 'arena-11-thane', business: 'Arena 11 Football Turf', short: 'Arena 11', owner: 'Arjun Mehta', locality: 'Thane West', address: 'Kolshet Road, Thane West, Maharashtra', phone: '919876543210', initials: 'A11' }),
  kickoff: tenant({ id: 'kickoff', slug: 'kickoff-arena-vashi', business: 'KickOff Arena', short: 'KickOff', owner: 'Neha Shah', locality: 'Vashi', address: 'Sector 19, Vashi, Navi Mumbai', phone: '919811223344', initials: 'KO' }),
})
