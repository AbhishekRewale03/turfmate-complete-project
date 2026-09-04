import { createHash } from 'node:crypto'
import { DomainError } from '../../domain/errors'
import type { RefundRecord } from '../../domain/backend-types'
import type { AuthoritativeRepository } from '../../repositories/contracts'
import type { PaymentProvider,ProviderRefund } from '../../payments/provider'

type CancellationActor={type:'CUSTOMER'|'USER';id:string}
type RefundStatus=RefundRecord['status']

const deterministicRefundId=(bookingId:string)=>`rf_${createHash('sha256').update(bookingId).digest('hex').slice(0,24)}`
const mapRefundStatus=(status:ProviderRefund['status']):RefundStatus=>status

export async function cancelBooking(
 repo:AuthoritativeRepository,
 provider:PaymentProvider,
 bookingId:string,
 actor:CancellationActor,
 reason:string,
 idempotencyKey:string,
 expectedTenantId?:string,
){
 const booking=await repo.getBookingByLocator(bookingId)
 if(!booking||(expectedTenantId&&booking.tenantId!==expectedTenantId))throw new DomainError('BOOKING_NOT_FOUND','Booking not found.',404)
 const id=deterministicRefundId(bookingId)
 if(booking.bookingStatus==='CANCELLED'){
  const existing=await repo.getRefund(id)
  return{bookingId,status:'CANCELLED' as const,refundId:existing?.refundId,refundStatus:existing?.status,idempotent:true}
 }
 if(booking.bookingStatus==='COMPLETED')throw new DomainError('BOOKING_ALREADY_COMPLETED','Completed bookings cannot be cancelled.',409)

 const context=await repo.getBookingContext(booking.tenantId,booking.turfId)
 if(!context)throw new DomainError('TURF_NOT_FOUND','Booking configuration was not found.',404)
 if(actor.type==='CUSTOMER'){
  if(!context.settings.cancellationEnabled)throw new DomainError('CANCELLATION_NOT_ALLOWED','This turf does not allow customer cancellation.',409)
  if(new Date(booking.startAt).getTime()-Date.now()<=context.settings.cancellationCutoffHours*3_600_000)throw new DomainError('CANCELLATION_CUTOFF_PASSED','The cancellation cutoff has passed.',409)
 }

 const order=booking.paymentOrderId?await repo.getPaymentOrder(booking.paymentOrderId):null
 const needsRefund=Boolean(order&&booking.amountPaid>0&&booking.paymentMethod==='CASHFREE')
 let refund:RefundRecord|undefined
 if(needsRefund){
  const now=new Date().toISOString()
  refund={
   refundId:id,tenantId:booking.tenantId,turfId:booking.turfId,bookingId:booking.id,
   paymentOrderId:order!.merchantOrderId,providerOrderId:order!.providerOrderId??order!.merchantOrderId,
   providerPaymentId:order!.providerPaymentId,requestedAmount:Math.min(booking.amountPaid,booking.finalPrice),
   confirmedAmount:0,currency:'INR',reason,status:'REQUESTED',idempotencyKey,requestedBy:actor,
   createdAt:now,updatedAt:now,
  }
 }

 const cancelled=await repo.cancelBookingAtomic(booking.id,booking.tenantId,actor,reason,refund)
  if(cancelled.alreadyCancelled||!refund)return{bookingId,status:'CANCELLED' as const,refundId:cancelled.refund?.refundId,refundStatus:cancelled.refund?.status,manualRefundRequired:cancelled.booking.manualRefundRequired,idempotent:cancelled.alreadyCancelled}
 try{
  const remote=await provider.createRefund({refundId:refund.refundId,providerOrderId:refund.paymentOrderId,amount:refund.requestedAmount,note:reason.slice(0,100),idempotencyKey})
  const status=mapRefundStatus(remote.status)
  await repo.updateRefund(refund.refundId,{providerRefundId:remote.providerRefundId,status,confirmedAmount:status==='SUCCESS'?remote.amount:0,processedAt:status==='SUCCESS'?new Date().toISOString():undefined})
  return{bookingId,status:'CANCELLED' as const,refundId:refund.refundId,refundStatus:status,idempotent:false}
 }catch(error){
  await repo.updateRefund(refund.refundId,{status:'FAILED',failureReason:error instanceof Error?error.message.slice(0,200):'Provider request failed'})
  throw error
 }
}

export async function reconcileRefund(repo:AuthoritativeRepository,provider:PaymentProvider,id:string){
 const refund=await repo.getRefund(id)
 if(!refund)throw new DomainError('PAYMENT_FAILED','Refund not found.',404)
 if(['SUCCESS','CANCELLED'].includes(refund.status))return refund
 const remote=await provider.getRefund(refund.paymentOrderId,refund.refundId)
 const status=mapRefundStatus(remote.status)
 const changes:Partial<RefundRecord>={providerRefundId:remote.providerRefundId,status,confirmedAmount:status==='SUCCESS'?remote.amount:0,processedAt:status==='SUCCESS'?new Date().toISOString():undefined}
 await repo.updateRefund(id,changes)
 return{...refund,...changes}
}

export async function processRefundWebhook(repo:AuthoritativeRepository,provider:PaymentProvider,raw:string,timestamp:string,signature:string,eventId?:string){
 if(!provider.verifyWebhook(raw,timestamp,signature))throw new DomainError('FORBIDDEN','Invalid webhook signature.',401)
 let event:{type?:string;data?:{refund?:{refund_id?:string;cf_refund_id?:string;refund_amount?:number;refund_currency?:string;refund_status?:string;status_description?:string}}}
 try{event=JSON.parse(raw)}catch{throw new DomainError('VALIDATION_ERROR','Invalid refund webhook body.',400)}
 const data=event.data?.refund
 if(event.type!=='REFUND_STATUS_WEBHOOK'||!data?.refund_id)throw new DomainError('VALIDATION_ERROR','Unsupported refund webhook.',400)
 const refund=await repo.getRefund(data.refund_id)
 if(!refund)throw new DomainError('PAYMENT_FAILED','Unknown refund.',404)
 if(data.refund_amount!==refund.requestedAmount||data.refund_currency!==refund.currency)throw new DomainError('PAYMENT_MISMATCH','Refund webhook did not match the request.',409)
 const dedupeId=eventId?.trim()||createHash('sha256').update(`${timestamp}:${signature}`).digest('hex')
 if(!await repo.claimWebhookEvent(dedupeId,event.type))return{accepted:true,idempotent:true,status:refund.status}
 if(['SUCCESS','CANCELLED'].includes(refund.status))return{accepted:true,idempotent:true,status:refund.status}
 const status:RefundStatus=data.refund_status==='SUCCESS'?'SUCCESS':data.refund_status==='CANCELLED'?'CANCELLED':data.refund_status==='FAILED'?'FAILED':'PENDING'
 try{
  await repo.updateRefund(refund.refundId,{providerRefundId:data.cf_refund_id,status,confirmedAmount:status==='SUCCESS'?data.refund_amount:0,processedAt:status==='SUCCESS'?new Date().toISOString():undefined,failureReason:status==='FAILED'?data.status_description?.slice(0,200):undefined})
  return{accepted:true,idempotent:false,status}
 }catch(error){
  await repo.releaseWebhookEvent(dedupeId).catch(()=>undefined)
  throw error
 }
}
