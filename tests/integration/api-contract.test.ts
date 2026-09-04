import { describe,expect,it } from 'vitest'
import { isoDateTimeSchema,manualBookingSchema,paymentOrderRequestSchema } from '../../lib/domain/schemas'

describe('API boundary contracts',()=>{
 it('canonicalizes equivalent offset timestamps for Firestore queries and lock IDs',()=>{
  expect(isoDateTimeSchema.parse('2026-09-04T22:00:00+05:30')).toBe('2026-09-04T16:30:00.000Z')
 })

 it('normalizes manual-booking phone and timestamp input',()=>{
  const input=manualBookingSchema.parse({turfId:'main',startAt:'2026-09-04T22:00:00+05:30',durationMinutes:60,customerName:'Test Player',customerPhone:'99999 99999',paymentStatus:'PAY_AT_VENUE'})
  expect(input).toMatchObject({startAt:'2026-09-04T16:30:00.000Z',customerPhone:'919999999999'})
 })

 it('rejects unknown payment-order fields',()=>{
  const parsed=paymentOrderRequestSchema.safeParse({turfId:'main',startAt:'2026-09-04T16:30:00.000Z',durationMinutes:60,customerName:'Test Player',customerPhone:'9999999999',customerSessionId:'customer-session-1234',idempotencyKey:'9e8cbd58-4f77-4a6e-a56d-dc535faf4563',calculatedPrice:1})
  expect(parsed.success).toBe(false)
 })
})
