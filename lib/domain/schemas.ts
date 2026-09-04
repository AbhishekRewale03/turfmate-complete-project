import { z } from 'zod'

export const phoneSchema=z.string().trim().transform(v=>v.replace(/\D/g,'')).refine(v=>/^(?:91)?[6-9]\d{9}$/.test(v),'Invalid Indian mobile number').transform(v=>v.length===10?`91${v}`:v)
export const emailSchema=z.string().trim().email().max(254).optional().or(z.literal('').transform(()=>undefined))
export const slugSchema=z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(64)
export const isoDateTimeSchema=z.string().datetime({offset:true}).transform(value=>new Date(value).toISOString())
export const paymentOrderRequestSchema=z.object({turfId:z.string().min(1).max(128),startAt:isoDateTimeSchema,durationMinutes:z.number().int().positive().max(720),customerName:z.string().trim().min(2).max(100),customerPhone:phoneSchema,customerEmail:emailSchema,customerSessionId:z.string().min(16).max(128),idempotencyKey:z.string().uuid()}).strict()
export const lookupRequestSchema=z.object({bookingId:z.string().trim().min(6).max(64),phone:phoneSchema}).strict()
export const sessionRequestSchema=z.object({idToken:z.string().min(100).max(10000),csrfToken:z.string().min(20).max(256)}).strict()
export const manualBookingSchema=z.object({turfId:z.string().min(1),startAt:isoDateTimeSchema,durationMinutes:z.number().int().positive(),customerName:z.string().trim().min(2).max(100),customerPhone:phoneSchema,customerEmail:emailSchema,finalPrice:z.number().nonnegative().optional(),paymentStatus:z.enum(['UNPAID','ADVANCE_PAID','PAID','PAY_AT_VENUE','CASH','COMPLIMENTARY']),notes:z.string().max(1000).optional()}).strict()
