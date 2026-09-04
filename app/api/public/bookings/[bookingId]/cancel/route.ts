import { z } from 'zod'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { verifyCustomerToken } from '@/lib/services/payments/payment-service'
import { cancelBooking } from '@/lib/services/cancellations/cancellation-service'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { DomainError } from '@/lib/domain/errors'
import { assertOrigin } from '@/lib/api/security'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'

const schema=z.object({reason:z.string().trim().min(3).max(250),idempotencyKey:z.string().uuid()}).strict()
export async function POST(request:Request,{params}:{params:Promise<{bookingId:string}>}){
 const id=requestId(request.headers)
 try{
  assertOrigin(request)
  const bookingId=(await params).bookingId.slice(0,64)
  const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??''
  await verifyAppCheck(request)
  await enforceRateLimit({scope:'customer-cancel',identifier:`${clientIdentifier(request)}:${bookingId}`,limit:5,windowMs:60_000})
  if(!token||!(await verifyCustomerToken(token,bookingId,'booking')))throw new DomainError('FORBIDDEN','Booking access is invalid or expired.',403)
  const body=schema.parse(await limitedJson(request))
  return ok(await cancelBooking(new FirestoreRepository(),getPaymentProvider(),bookingId,{type:'CUSTOMER',id:'booking-token'},body.reason,body.idempotencyKey),id)
 }catch(error){return fail(error,id)}
}
