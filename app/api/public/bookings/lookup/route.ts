import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { issueCustomerToken } from '@/lib/services/payments/payment-service'
import { phoneLookupHash } from '@/lib/services/bookings/booking-engine'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { safeEqual } from '@/lib/api/security'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { lookupRequestSchema } from '@/lib/domain/schemas'
import { DomainError } from '@/lib/domain/errors'
const safe=(b:Awaited<ReturnType<FirestoreRepository['getBookingByLocator']>>)=>b&&({id:b.id,turfId:b.turfId,customerName:b.customerName,startAt:b.startAt,endAt:b.endAt,durationMinutes:b.durationMinutes,finalPrice:b.finalPrice,amountPaid:b.amountPaid,balanceDue:b.balanceDue,currency:b.currency,bookingStatus:b.bookingStatus,paymentStatus:b.paymentStatus,paymentMethod:b.paymentMethod,manualRefundRequired:b.manualRefundRequired,source:b.source})
export async function POST(request:Request){const id=requestId(request.headers);try{await verifyAppCheck(request);await enforceRateLimit({scope:'booking-lookup',identifier:clientIdentifier(request),limit:8,windowMs:60_000});const body=lookupRequestSchema.parse(await limitedJson(request));const booking=await new FirestoreRepository().getBookingByLocator(body.bookingId);if(!booking||!safeEqual(booking.customerPhoneLookupHash,phoneLookupHash(body.phone)))throw new DomainError('BOOKING_NOT_FOUND','Booking ID and phone number did not match.',404);return ok({booking:safe(booking),accessToken:await issueCustomerToken(booking.id,'booking')},id)}catch(error){return fail(error,id)}}
