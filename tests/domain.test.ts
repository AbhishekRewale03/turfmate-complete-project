import { describe, expect, it } from 'vitest'
import { conflictReason, generateSlots, isHoldActive, rangesConflict, validDuration, withinOperatingHours } from '../lib/domain/availability'
import { calculatePrice } from '../lib/domain/pricing'
import { calculateReports } from '../lib/domain/reports'
import { createSeedData } from '../lib/data/seeds'
import { addMinutes, localDate, zonedDateTime } from '../lib/domain/time'
import type { Booking, Hold } from '../lib/domain/types'

const data = createSeedData().arena11
const at = (date:string, minute:number) => zonedDateTime(date, minute, data.turf.timezone)
const fakeBooking = (status:'confirmed'|'cancelled'='confirmed'):Booking => ({ ...data.bookings[0], id:'TEST', startAt:at('2026-09-07',1140), endAt:at('2026-09-07',1200), durationMinutes:60, status })

describe('availability engine',()=>{
  it('allows adjacent ranges',()=>expect(rangesConflict(at('2026-09-07',1140),at('2026-09-07',1200),at('2026-09-07',1200),at('2026-09-07',1260))).toBe(false))
  it('rejects overlapping ranges',()=>expect(rangesConflict(at('2026-09-07',1140),at('2026-09-07',1260),at('2026-09-07',1200),at('2026-09-07',1320))).toBe(true))
  it('supports cross-midnight booking',()=>expect(localDate(at('2026-09-07',1500),data.turf.timezone)).toBe('2026-09-08'))
  it('active hold blocks',()=>{const h:Hold={id:'h',tenantId:'arena11',turfId:data.turf.id,draftId:'d',startAt:at('2026-09-07',1140),endAt:at('2026-09-07',1200),createdAt:new Date().toISOString(),expiresAt:addMinutes(new Date().toISOString(),10)};expect(conflictReason(h.startAt,h.endAt,[],[],[h])).toBe('hold')})
  it('expired hold releases',()=>{const h:Hold={id:'h',tenantId:'arena11',turfId:data.turf.id,draftId:'d',startAt:at('2026-09-07',1140),endAt:at('2026-09-07',1200),createdAt:new Date().toISOString(),expiresAt:addMinutes(new Date().toISOString(),-1)};expect(isHoldActive(h)).toBe(false);expect(conflictReason(h.startAt,h.endAt,[],[],[h])).toBe(null)})
  it('cancelled booking releases',()=>expect(conflictReason(at('2026-09-07',1140),at('2026-09-07',1200),[fakeBooking('cancelled')],[],[])).toBe(null))
  it('closed day has no slots',()=>expect(generateSlots('2026-09-07',data.turf.timezone,{...data.operatingHours,1:{...data.operatingHours[1],closed:true}},60)).toHaveLength(0))
  it('honours operating boundary',()=>expect(withinOperatingHours(at('2026-09-07',360),at('2026-09-08',120),data.turf.timezone,data.operatingHours)).toBe(true))
  it('rejects invalid duration',()=>expect(validDuration(at('2026-09-07',360),30,data.turf.timezone,data.operatingHours,60,180)).toBe(false))
})

describe('pricing engine',()=>{
  it('prices weekday daytime',()=>expect(calculatePrice(at('2026-09-07',600),at('2026-09-07',660),data.turf.timezone,data.pricingRules).total).toBe(700))
  it('prices weekend daytime',()=>expect(calculatePrice(at('2026-09-06',600),at('2026-09-06',660),data.turf.timezone,data.pricingRules).total).toBe(900))
  it('splits price bands',()=>expect(calculatePrice(at('2026-09-07',1320),at('2026-09-08',60),data.turf.timezone,data.pricingRules).total).toBe(3000))
  it('uses next calendar day after midnight',()=>expect(calculatePrice(at('2026-09-06',1380),at('2026-09-07',60),data.turf.timezone,data.pricingRules).snapshot.lines.at(-1)?.rate).toBe(900))
  it('existing price snapshot is immutable data',()=>{const b=fakeBooking();const original=b.pricingSnapshot.rules[0].pricePerHour;const changed=data.pricingRules.map(r=>({...r,pricePerHour:r.pricePerHour+100}));expect(changed[0].pricePerHour).not.toBe(original);expect(b.pricingSnapshot.rules[0].pricePerHour).toBe(original)})
})

describe('tenant and reports',()=>{
  it('keeps tenant data isolated',()=>{const seeded=createSeedData();seeded.arena11.bookings.push(fakeBooking());expect(seeded.kickoff.bookings.some(b=>b.id==='TEST')).toBe(false)})
  it('calculates reports from active tenant bookings',()=>{const b={...fakeBooking(),paidAmount:500,finalPrice:1200};const r=calculateReports([b],data.turf.timezone,'2026-09-07');expect(r.todayRevenue).toBe(500);expect(r.outstanding).toBe(700);expect(r.monthlyBookings).toBe(1)})
})
