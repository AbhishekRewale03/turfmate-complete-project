import { createHash } from 'node:crypto'
import { SignJWT,jwtVerify } from 'jose'
import { DomainError } from '../../domain/errors'
import type { PaymentOrder,ServerBookingSettings } from '../../domain/backend-types'
import type { AuthoritativeRepository } from '../../repositories/contracts'
import type { PaymentProvider,ProviderOrder } from '../../payments/provider'
import { audit,buildManualUpiBooking,buildPaidBooking,createServerHold } from '../bookings/booking-engine'

const hash=(value:string)=>createHash('sha256').update(value).digest('hex')
const tokenSecret=()=>{const v=process.env.BOOKING_LOOKUP_HMAC_SECRET;if(!v||v.length<32)throw new DomainError('CONFIGURATION_ERROR','Customer access tokens are not configured.',500);return new TextEncoder().encode(v)}
const merchantId=(key:string)=>`tm_${key.replace(/-/g,'').slice(0,32)}`
const isUpiId=(value:string)=>/^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(value)
const collectionMode=(settings:ServerBookingSettings)=>settings.paymentCollectionMode??'CASHFREE'

export async function issueCustomerToken(subject:string,scope:'payment'|'booking'){return new SignJWT({scope}).setProtectedHeader({alg:'HS256'}).setSubject(subject).setIssuedAt().setExpirationTime('15m').sign(tokenSecret())}
export async function verifyCustomerToken(token:string,subject:string,scope:'payment'|'booking'){try{const {payload}=await jwtVerify(token,tokenSecret());return payload.sub===subject&&payload.scope===scope}catch{return false}}
export async function verifyStoredPaymentToken(token:string,order:PaymentOrder){return (await verifyCustomerToken(token,order.merchantOrderId,'payment'))&&hash(token)===order.customerAccessTokenHash}

function upiUri(order:PaymentOrder){if(!order.upiId)return undefined;const params=new URLSearchParams({pa:order.upiId,pn:order.payeeName??'TurfMate Venue',am:order.expectedAmount.toFixed(2),cu:'INR',tr:order.paymentReference??order.merchantOrderId,tn:`TurfMate ${order.paymentReference??order.merchantOrderId}`});return`upi://pay?${params.toString()}`}
const safeOrder=(order:PaymentOrder,token:string)=>{const mode=order.paymentCollectionMode??'CASHFREE';return{merchantOrderId:order.merchantOrderId,paymentSessionId:order.paymentSessionId,expiresAt:order.expiresAt,payableNow:order.expectedAmount,total:order.authoritativePricing?.total??order.expectedAmount,currency:order.currency,cashfreeMode:process.env.NEXT_PUBLIC_CASHFREE_MODE??'sandbox',customerStatusToken:token,status:order.status,bookingId:order.bookingId,paymentCollectionMode:mode,paymentReference:order.paymentReference,upiId:mode==='MANUAL_UPI'?order.upiId:undefined,payeeName:mode==='MANUAL_UPI'?order.payeeName:undefined,paymentInstructions:mode==='MANUAL_UPI'?order.paymentInstructions:undefined,upiUri:mode==='MANUAL_UPI'?upiUri(order):undefined,paymentClaimedAt:order.paymentClaimedAt,rejectionReason:order.rejectionReason}}

async function createCashfreeRemote(repo:AuthoritativeRepository,provider:PaymentProvider,order:PaymentOrder,slug:string,requestId:string){const appUrl=process.env.APP_URL??'http://localhost:3000';const input={merchantOrderId:order.merchantOrderId,amount:order.expectedAmount,currency:'INR' as const,customer:{id:hash(order.holdId).slice(0,24),name:order.customer.name,phone:order.customer.phone,email:order.customer.email},returnUrl:`${appUrl}/t/${slug}/payment?order_id=${order.merchantOrderId}`,notifyUrl:`${appUrl}/api/webhooks/cashfree`,expiresAt:order.expiresAt,idempotencyKey:order.idempotencyKey,requestId};let remote:ProviderOrder;try{remote=await provider.getOrder(order.merchantOrderId);if(remote.status==='FAILED'&&!remote.paymentSessionId)remote=await provider.createOrder(input)}catch{remote=await provider.createOrder(input)}await repo.updatePaymentOrder(order.merchantOrderId,{providerOrderId:remote.providerOrderId,paymentSessionId:remote.paymentSessionId,status:remote.status});return{...order,providerOrderId:remote.providerOrderId,paymentSessionId:remote.paymentSessionId,status:remote.status}}

export async function createPaymentAttempt(repo:AuthoritativeRepository,provider:PaymentProvider,slug:string,input:{turfId:string;startAt:string;durationMinutes:number;customerName:string;customerPhone:string;customerEmail?:string;customerSessionId:string;idempotencyKey:string},requestId:string){
 const turf=await repo.resolvePublicTurf(slug);if(!turf)throw new DomainError('TURF_NOT_FOUND','Turf not found.',404);if(!turf.isBookingEnabled)throw new DomainError('BOOKING_DISABLED','Online booking is currently unavailable.',409);if(turf.turfId!==input.turfId)throw new DomainError('FORBIDDEN','Turf does not match this booking link.',403)
 const context=await repo.getBookingContext(turf.tenantId,turf.turfId);if(!context)throw new DomainError('TURF_NOT_FOUND','Booking configuration was not found.',404)
 const orderId=merchantId(input.idempotencyKey),requestHash=hash(JSON.stringify({slug,...input}));let existing=await repo.getPaymentOrder(orderId)
 if(existing){if(existing.requestHash!==requestHash)throw new DomainError('VALIDATION_ERROR','Idempotency key was reused with a different request.',409);const token=await issueCustomerToken(orderId,'payment');await repo.updatePaymentOrder(orderId,{customerAccessTokenHash:hash(token)});existing={...existing,customerAccessTokenHash:hash(token)};if((existing.paymentCollectionMode??'CASHFREE')==='CASHFREE'&&existing.status==='CREATED'&&!existing.paymentSessionId)existing=await createCashfreeRemote(repo,provider,existing,slug,requestId);return safeOrder(existing,token)}
 const mode=collectionMode(context.settings)
 if(mode==='MANUAL_UPI'&&(!context.settings.manualUpi?.upiId||!isUpiId(context.settings.manualUpi.upiId)))throw new DomainError('CONFIGURATION_ERROR','Manual UPI is not configured for this turf.',503)
 if(mode==='MANUAL_UPI'&&await repo.hasPendingManualClaim(turf.tenantId,input.customerSessionId))throw new DomainError('PAYMENT_PENDING','You already have a payment awaiting owner verification.',409)
 const created=await createServerHold(repo,context,{startAt:input.startAt,durationMinutes:input.durationMinutes,customerSessionId:input.customerSessionId,requestId});const token=await issueCustomerToken(orderId,'payment'),now=new Date().toISOString()
 const order:PaymentOrder={merchantOrderId:orderId,tenantId:turf.tenantId,turfId:turf.turfId,holdId:created.hold.id,provider:mode==='MANUAL_UPI'?'MANUAL_UPI':process.env.PAYMENT_PROVIDER==='cashfree'?'CASHFREE':'MOCK',paymentCollectionMode:mode,startAt:created.hold.startAt,endAt:created.hold.endAt,durationMinutes:input.durationMinutes,expectedAmount:created.payableNow,currency:'INR',authoritativePricing:created.hold.authoritativePricing,status:'CREATED',idempotencyKey:input.idempotencyKey,requestHash,customerAccessTokenHash:hash(token),customer:{name:input.customerName,phone:input.customerPhone,email:input.customerEmail},expiresAt:created.hold.expiresAt,paymentReference:orderId.toUpperCase(),upiId:mode==='MANUAL_UPI'?context.settings.manualUpi?.upiId:undefined,payeeName:mode==='MANUAL_UPI'?(context.settings.manualUpi?.payeeName||turf.shortName):undefined,paymentInstructions:mode==='MANUAL_UPI'?context.settings.manualUpi?.instructions:undefined,createdAt:now,updatedAt:now}
 await repo.savePaymentOrder(order)
 if(mode==='MANUAL_UPI'){await repo.updatePaymentOrder(orderId,{status:'ACTIVE'});return safeOrder({...order,status:'ACTIVE'},token)}
 return safeOrder(await createCashfreeRemote(repo,provider,order,slug,requestId),token)
}

async function finalizeCashfree(repo:AuthoritativeRepository,order:PaymentOrder,providerPaymentId:string|undefined,requestId:string,actorId:string){const hold=await repo.getHold(order.tenantId,order.holdId),context=await repo.getBookingContext(order.tenantId,order.turfId);if(!hold||!context||!hold.authoritativePricing||!order.authoritativePricing){await repo.markPaymentAttention(order.merchantOrderId,'Verified payment has no immutable pricing snapshot or finalizable hold.',audit(order.tenantId,'SYSTEM',actorId,'PAYMENT_REQUIRES_ATTENTION','PAYMENT_ORDER',order.merchantOrderId,requestId));throw new DomainError('HOLD_EXPIRED','Paid hold requires manual reconciliation.',409)}const booking=buildPaidBooking(context,hold,order.customer,order.expectedAmount,order.merchantOrderId,providerPaymentId,'CASHFREE',{type:'SYSTEM',id:actorId});try{return await repo.finalizePaidBooking(order.merchantOrderId,booking,audit(order.tenantId,'SYSTEM',actorId,'BOOKING_CONFIRMED','BOOKING',booking.id,requestId))}catch(error){if(error instanceof DomainError&&error.code==='HOLD_EXPIRED')await repo.markPaymentAttention(order.merchantOrderId,'Payment verified after the reservation lock was released or expired.',audit(order.tenantId,'SYSTEM',actorId,'PAYMENT_REQUIRES_ATTENTION','PAYMENT_ORDER',order.merchantOrderId,requestId));throw error}}

export async function reconcileOrder(repo:AuthoritativeRepository,provider:PaymentProvider,orderId:string,requestId:string){
 const order=await repo.getPaymentOrder(orderId)
 if(!order)throw new DomainError('PAYMENT_FAILED','Payment order was not found.',404)
 if(order.bookingId)return{status:'PAID',bookingId:order.bookingId}
 if(order.paymentCollectionMode==='MANUAL_UPI')return{status:order.status,bookingId:order.bookingId,rejectionReason:order.rejectionReason}
 const remote=await provider.getOrder(orderId)
 if(remote.status!=='PAID'){
  const deadlinePassed=new Date(order.expiresAt)<=new Date()
  const status=remote.status==='EXPIRED'||deadlinePassed?'EXPIRED':remote.status
  await repo.updatePaymentOrder(orderId,{status})
  if(status==='EXPIRED')await repo.expireHoldAtomic(order.tenantId,order.holdId,new Date().toISOString(),audit(order.tenantId,'SYSTEM','payment-reconciliation','HOLD_EXPIRED','HOLD',order.holdId,requestId))
  return{status,bookingId:undefined}
 }
 if(remote.amount!==order.expectedAmount||remote.currency!==order.currency)throw new DomainError('PAYMENT_MISMATCH','Verified payment did not match the expected amount.',409)
 const payments=await provider.getPaymentsForOrder(orderId).catch(()=>[])
 const successful=payments.find(p=>p.status==='SUCCESS'&&p.amount===order.expectedAmount&&p.currency===order.currency)
 const providerPaymentId=successful?.id??remote.providerPaymentId
 await repo.updatePaymentOrder(orderId,{status:'PAID',paidAt:new Date().toISOString(),providerPaymentId})
 const saved=await finalizeCashfree(repo,{...order,status:'PAID'},providerPaymentId,requestId,'payment-reconciliation')
 return{status:'PAID',bookingId:saved.id}
}

export async function claimManualPayment(repo:AuthoritativeRepository,order:PaymentOrder,customerSessionId:string,requestId:string){const now=new Date().toISOString(),claimed=await repo.claimManualPayment(order.merchantOrderId,customerSessionId,now,audit(order.tenantId,'CUSTOMER',customerSessionId,'MANUAL_PAYMENT_CLAIMED','PAYMENT_ORDER',order.merchantOrderId,requestId,{amount:order.expectedAmount}));return{status:claimed.status,paymentReference:claimed.paymentReference,paymentClaimedAt:claimed.paymentClaimedAt}}
export async function approveManualPayment(repo:AuthoritativeRepository,orderId:string,tenantId:string,actorId:string,requestId:string){const order=await repo.getPaymentOrder(orderId);if(!order||order.tenantId!==tenantId)throw new DomainError('BOOKING_NOT_FOUND','Payment claim was not found.',404);if(order.bookingId){const booking=await repo.getBookingByLocator(order.bookingId);if(booking)return booking}const hold=await repo.getHold(tenantId,order.holdId),context=await repo.getBookingContext(tenantId,order.turfId);if(!hold||!context)throw new DomainError('HOLD_EXPIRED','Payment claim is no longer available.',409);const booking=buildManualUpiBooking(context,hold,order,actorId),now=new Date().toISOString();return repo.approveManualPayment(orderId,tenantId,booking,actorId,now,audit(tenantId,'USER',actorId,'MANUAL_PAYMENT_APPROVED','BOOKING',booking.id,requestId,{paymentReference:order.paymentReference}))}
export async function rejectManualPayment(repo:AuthoritativeRepository,orderId:string,tenantId:string,actorId:string,reason:string,requestId:string){const order=await repo.getPaymentOrder(orderId);if(!order||order.tenantId!==tenantId)throw new DomainError('BOOKING_NOT_FOUND','Payment claim was not found.',404);return repo.rejectManualPayment(orderId,tenantId,actorId,reason,new Date().toISOString(),audit(tenantId,'USER',actorId,'MANUAL_PAYMENT_REJECTED','PAYMENT_ORDER',orderId,requestId,{reason}))}

export async function processCashfreeWebhook(repo:AuthoritativeRepository,provider:PaymentProvider,rawBody:string,timestamp:string,signature:string,requestId:string){
 if(!provider.verifyWebhook(rawBody,timestamp,signature))throw new DomainError('FORBIDDEN','Invalid webhook signature.',401)
 const event=JSON.parse(rawBody) as {type?:string;data?:{order?:{order_id?:string;order_amount?:number;order_currency?:string};payment?:{cf_payment_id?:string;payment_status?:string;payment_amount?:number;payment_currency?:string}}}
 const orderId=event.data?.order?.order_id
 if(!orderId)throw new DomainError('VALIDATION_ERROR','Webhook order ID is missing.',400)
 const order=await repo.getPaymentOrder(orderId)
 if(!order)throw new DomainError('PAYMENT_FAILED','Unknown payment order.',404)
 if((order.paymentCollectionMode??'CASHFREE')!=='CASHFREE')throw new DomainError('VALIDATION_ERROR','Webhook does not match this payment mode.',409)
 if(event.type!=='PAYMENT_SUCCESS_WEBHOOK'||event.data?.payment?.payment_status!=='SUCCESS'){
  const failed=event.type==='PAYMENT_FAILED_WEBHOOK'||event.data?.payment?.payment_status==='FAILED'
  const expired=new Date(order.expiresAt)<=new Date()
  if(failed||expired)await repo.updatePaymentOrder(orderId,{status:expired?'EXPIRED':'FAILED'})
  if(expired)await repo.expireHoldAtomic(order.tenantId,order.holdId,new Date().toISOString(),audit(order.tenantId,'SYSTEM','cashfree-webhook','HOLD_EXPIRED','HOLD',order.holdId,requestId))
  return{accepted:true,finalized:false,status:expired?'EXPIRED':failed?'FAILED':order.status}
 }
 const amount=event.data?.payment?.payment_amount??event.data?.order?.order_amount
 const currency=event.data?.payment?.payment_currency??event.data?.order?.order_currency
 if(amount!==order.expectedAmount||currency!==order.currency)throw new DomainError('PAYMENT_MISMATCH','Webhook payment did not match the order.',409)
 const providerPaymentId=event.data?.payment?.cf_payment_id
 await repo.updatePaymentOrder(orderId,{status:'PAID',providerPaymentId,paidAt:new Date().toISOString()})
 const saved=await finalizeCashfree(repo,{...order,status:'PAID'},providerPaymentId,requestId,'cashfree-webhook')
 return{accepted:true,finalized:true,bookingId:saved.id}
}
