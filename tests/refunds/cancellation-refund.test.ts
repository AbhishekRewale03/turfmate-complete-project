import { createHmac,randomUUID } from 'node:crypto'
import { beforeEach,describe,expect,it } from 'vitest'
import { MemoryRepository } from '../../lib/repositories/memory/memory-repository'
import { MockPaymentProvider } from '../../lib/payments/mock'
import { createManualBooking } from '../../lib/services/bookings/booking-engine'
import { cancelBooking,processRefundWebhook,reconcileRefund } from '../../lib/services/cancellations/cancellation-service'
import { createPaymentAttempt,reconcileOrder } from '../../lib/services/payments/payment-service'
import type { BookingContext } from '../../lib/repositories/contracts'
import { zonedDateTime } from '../../lib/domain/time'

process.env.BOOKING_LOOKUP_HMAC_SECRET='refund-test-secret-that-is-at-least-32-characters'
process.env.CASHFREE_CLIENT_SECRET='refund-webhook-secret'
process.env.PAYMENT_PROVIDER='mock'

const date=(days=2)=>new Date(Date.now()+days*86_400_000).toISOString().slice(0,10)
const context=(cutoff=4):BookingContext=>({
 tenant:{id:'ta',slug:'arena-a',legalName:'Arena',displayName:'Arena',status:'ACTIVE',timezone:'Asia/Kolkata',createdAt:'',updatedAt:''},
 turf:{tenantId:'ta',turfId:'t1',slug:'arena-a',name:'Arena',shortName:'Arena',address:'A',locality:'M',mapUrl:'',phone:'919999999999',whatsapp:'919999999999',sports:[],amenities:[],timezone:'Asia/Kolkata',branding:{},isBookingEnabled:true},
 settings:{paymentMode:'FULL',advanceValue:0,minDurationMinutes:60,maxDurationMinutes:180,slotIntervalMinutes:30,cancellationEnabled:true,cancellationCutoffHours:cutoff,bookingWindowDays:365,holdDurationMinutes:10},
 hours:Array.from({length:7},(_,weekday)=>({weekday,closed:false,openMinute:0,closeMinute:1440})),
 pricingRules:[{id:'r',tenantId:'ta',turfId:'t1',days:[0,1,2,3,4,5,6],startTime:0,endTime:1440,hourlyRate:1000,currency:'INR',priority:1}],
})

async function paidCancellation(repo:MemoryRepository,provider:MockPaymentProvider){
 const input={turfId:'t1',startAt:zonedDateTime(date(),700,'Asia/Kolkata'),durationMinutes:60,customerName:'Guest',customerPhone:'919999999999',customerSessionId:'customer-session-001',idempotencyKey:randomUUID()}
 const order=await createPaymentAttempt(repo,provider,'arena-a',input,'r')
 const remote=provider.orders.get(order.merchantOrderId)!
 provider.orders.set(order.merchantOrderId,{...remote,status:'PAID',providerPaymentId:'pay1'})
 const paid=await reconcileOrder(repo,provider,order.merchantOrderId,'r')
 const cancelled=await cancelBooking(repo,provider,paid.bookingId!,{type:'CUSTOMER',id:'token'},'Plans changed',randomUUID())
 return{paid,cancelled,refund:(await repo.getRefund(cancelled.refundId!))!}
}

describe('cancellation and refunds',()=>{
 let repo:MemoryRepository,provider:MockPaymentProvider
 beforeEach(()=>{repo=new MemoryRepository();provider=new MockPaymentProvider();repo.seed(context())})

 it('cancels once, releases locks, and makes duplicate requests idempotent',async()=>{
  const b=await createManualBooking(repo,context(),{startAt:zonedDateTime(date(),600,'Asia/Kolkata'),durationMinutes:60,customerName:'Guest',customerPhone:'919999999999',paymentStatus:'PAY_AT_VENUE',actorId:'o',requestId:'r'})
  expect(repo.locks.size).toBe(2)
  const one=await cancelBooking(repo,provider,b.id,{type:'CUSTOMER',id:'token'},'Plans changed',randomUUID())
  const two=await cancelBooking(repo,provider,b.id,{type:'CUSTOMER',id:'token'},'Plans changed',randomUUID())
  expect(one.status).toBe('CANCELLED');expect(two.idempotent).toBe(true);expect(repo.locks.size).toBe(0)
 })

 it('rejects cutoff, completed, and cross-tenant owner cancellation',async()=>{
  const c=context(1000);repo=new MemoryRepository();repo.seed(c)
  const b=await createManualBooking(repo,c,{startAt:zonedDateTime(date(),600,'Asia/Kolkata'),durationMinutes:60,customerName:'Guest',customerPhone:'919999999999',paymentStatus:'PAY_AT_VENUE',actorId:'o',requestId:'r'})
  await expect(cancelBooking(repo,provider,b.id,{type:'CUSTOMER',id:'x'},'Plans changed',randomUUID())).rejects.toMatchObject({code:'CANCELLATION_CUTOFF_PASSED'})
  await expect(cancelBooking(repo,provider,b.id,{type:'USER',id:'o'},'Owner action',randomUUID(),'other')).rejects.toMatchObject({code:'BOOKING_NOT_FOUND'})
  repo.bookings.set(b.id,{...b,bookingStatus:'COMPLETED'})
  await expect(cancelBooking(repo,provider,b.id,{type:'USER',id:'o'},'Owner action',randomUUID())).rejects.toMatchObject({code:'BOOKING_ALREADY_COMPLETED'})
 })

 it('calculates a server refund, sets pending, and avoids duplicate provider requests',async()=>{
  const {paid,cancelled,refund}=await paidCancellation(repo,provider)
  expect(refund.requestedAmount).toBe(1000)
  expect(cancelled.refundStatus).toBe('PENDING')
  expect(repo.bookings.get(paid.bookingId!)?.paymentStatus).toBe('REFUND_PENDING')
  const duplicate=await cancelBooking(repo,provider,paid.bookingId!,{type:'CUSTOMER',id:'token'},'Again',randomUUID())
  expect(duplicate.idempotent).toBe(true);expect(provider.refunds.size).toBe(1)
 })

 it('verifies signatures, deduplicates a success webhook, and marks the booking refunded',async()=>{
  const {paid,refund}=await paidCancellation(repo,provider)
  const body=JSON.stringify({type:'REFUND_STATUS_WEBHOOK',data:{refund:{refund_id:refund.refundId,cf_refund_id:'cf-r1',refund_amount:1000,refund_currency:'INR',refund_status:'SUCCESS'}}})
  const ts=String(Date.now()),sig=createHmac('sha256',process.env.CASHFREE_CLIENT_SECRET!).update(ts+body).digest('base64')
  await expect(processRefundWebhook(repo,provider,body,ts,'invalid')).rejects.toMatchObject({code:'FORBIDDEN'})
  const first=await processRefundWebhook(repo,provider,body,ts,sig,'event-1')
  const duplicate=await processRefundWebhook(repo,provider,body,ts,sig,'event-1')
  expect(first.idempotent).toBe(false);expect(duplicate.idempotent).toBe(true)
  expect((await repo.getRefund(refund.refundId))?.status).toBe('SUCCESS')
  expect(repo.bookings.get(paid.bookingId!)?.paymentStatus).toBe('REFUNDED')
 })

 it('retains failed refund visibility and can later reconcile verified success',async()=>{
  const {paid,refund}=await paidCancellation(repo,provider)
  provider.refunds.set(refund.refundId,{providerRefundId:'cf-r2',status:'FAILED',amount:1000})
  const failed=await reconcileRefund(repo,provider,refund.refundId)
  expect(failed.status).toBe('FAILED');expect(repo.bookings.get(paid.bookingId!)?.paymentStatus).toBe('REFUND_FAILED')
  provider.refunds.set(refund.refundId,{providerRefundId:'cf-r2',status:'SUCCESS',amount:1000})
  const succeeded=await reconcileRefund(repo,provider,refund.refundId)
  expect(succeeded.status).toBe('SUCCESS');expect(repo.bookings.get(paid.bookingId!)?.paymentStatus).toBe('REFUNDED')
 })

 it('returns a stable not-found error for an unknown refund',async()=>{
  await expect(reconcileRefund(repo,provider,'missing')).rejects.toMatchObject({status:404})
 })
})
