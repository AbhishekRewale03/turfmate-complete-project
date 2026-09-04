import { requireOwner } from '@/lib/auth/session'
import { assertOrigin } from '@/lib/api/security'
import { fail,ok,requestId } from '@/lib/api/response'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { cancelBooking } from '@/lib/services/cancellations/cancellation-service'
export async function POST(request:Request,{params}:{params:Promise<{bookingId:string}>}){const id=requestId(request.headers);try{assertOrigin(request);const {uid,tenantId}=await requireOwner('bookings:cancel');const bookingId=(await params).bookingId;return ok(await cancelBooking(new FirestoreRepository(),getPaymentProvider(),bookingId,{type:'USER',id:uid},'Cancelled by owner',crypto.randomUUID(),tenantId),id)}catch(error){return fail(error,id)}}
