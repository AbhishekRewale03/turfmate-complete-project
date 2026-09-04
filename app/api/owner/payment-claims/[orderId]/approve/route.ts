import { requireOwner } from '@/lib/auth/session'
import { assertOrigin } from '@/lib/api/security'
import { fail,ok,requestId } from '@/lib/api/response'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { approveManualPayment } from '@/lib/services/payments/payment-service'
export async function POST(request:Request,{params}:{params:Promise<{orderId:string}>}){const id=requestId(request.headers);try{assertOrigin(request);const{tenantId,uid}=await requireOwner('payments:manage');return ok(await approveManualPayment(new FirestoreRepository(),(await params).orderId,tenantId,uid,id),id)}catch(error){return fail(error,id)}}
