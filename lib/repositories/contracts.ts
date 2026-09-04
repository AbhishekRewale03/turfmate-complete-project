import type { AuditEvent,PaymentOrder,PublicTurf,RefundRecord,ServerBooking,ServerBookingSettings,ServerHold,ServerOperatingDay,ServerPricingRule,SlotLock,TenantRecord } from '../domain/backend-types'
export interface BookingContext{tenant:TenantRecord;turf:PublicTurf;settings:ServerBookingSettings;hours:ServerOperatingDay[];pricingRules:ServerPricingRule[]}
export interface HoldWrite{hold:ServerHold;locks:SlotLock[];audit:AuditEvent}
export interface AuthoritativeRepository{
 resolvePublicTurf(slug:string):Promise<PublicTurf|null>
 getBookingContext(tenantId:string,turfId:string):Promise<BookingContext|null>
 createHoldAtomic(input:HoldWrite,now:string):Promise<void>
 expireHoldAtomic(tenantId:string,holdId:string,now:string,audit:AuditEvent):Promise<'EXPIRED'|'SKIPPED'>
 listExpiredActiveHolds(tenantId:string,turfId:string,now:string,limit?:number):Promise<ServerHold[]>
 listExpiredActiveHoldsGlobal(now:string,limit?:number):Promise<ServerHold[]>
 hasPendingManualClaim(tenantId:string,customerSessionId:string):Promise<boolean>
 createManualBookingAtomic(booking:ServerBooking,locks:SlotLock[],audit:AuditEvent,now:string):Promise<void>
 savePaymentOrder(order:PaymentOrder):Promise<void>
 getPaymentOrder(orderId:string):Promise<PaymentOrder|null>
 getHold(tenantId:string,holdId:string):Promise<ServerHold|null>
 updatePaymentOrder(orderId:string,changes:Partial<PaymentOrder>):Promise<void>
 markPaymentAttention(orderId:string,reason:string,audit:AuditEvent):Promise<void>
 claimManualPayment(orderId:string,customerSessionId:string,now:string,audit:AuditEvent):Promise<PaymentOrder>
 approveManualPayment(orderId:string,tenantId:string,booking:ServerBooking,actorId:string,now:string,audit:AuditEvent):Promise<ServerBooking>
 rejectManualPayment(orderId:string,tenantId:string,actorId:string,reason:string,now:string,audit:AuditEvent):Promise<PaymentOrder>
 finalizePaidBooking(orderId:string,booking:ServerBooking,audit:AuditEvent):Promise<ServerBooking>
 getBookingByLocator(bookingId:string):Promise<ServerBooking|null>
 cancelBookingAtomic(bookingId:string,tenantId:string,actor:{type:'CUSTOMER'|'USER';id:string},reason:string,refund?:RefundRecord):Promise<{booking:ServerBooking;refund?:RefundRecord;alreadyCancelled:boolean}>
 getRefund(refundId:string):Promise<RefundRecord|null>
 updateRefund(refundId:string,changes:Partial<RefundRecord>):Promise<void>
 claimWebhookEvent(eventId:string,eventType:string):Promise<boolean>
 releaseWebhookEvent(eventId:string):Promise<void>
}
