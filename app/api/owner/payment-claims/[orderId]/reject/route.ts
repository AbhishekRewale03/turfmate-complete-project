import { z } from 'zod'
import { requireOwner } from '@/lib/auth/session'
import { assertOrigin } from '@/lib/api/security'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { rejectManualPayment } from '@/lib/services/payments/payment-service'
const schema=z.object({reason:z.string().trim().min(3).max(250)}).strict()
export async function POST(request:Request,{params}:{params:Promise<{orderId:string}>}){const id=requestId(request.headers);try{assertOrigin(request);const{tenantId,uid}=await requireOwner('payments:manage'),body=schema.parse(await limitedJson(request));return ok(await rejectManualPayment(new FirestoreRepository(),(await params).orderId,tenantId,uid,body.reason,id),id)}catch(error){return fail(error,id)}}
