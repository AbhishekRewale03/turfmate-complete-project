import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { reconcileOrder,verifyStoredPaymentToken } from '@/lib/services/payments/payment-service'
import { fail,ok,requestId } from '@/lib/api/response'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { DomainError } from '@/lib/domain/errors'
export async function GET(request:Request,{params}:{params:Promise<{orderId:string}>}){const id=requestId(request.headers);try{const orderId=(await params).orderId.slice(0,64);await verifyAppCheck(request);const repo=new FirestoreRepository(),order=await repo.getPaymentOrder(orderId);await enforceRateLimit({scope:'payment-status',identifier:`${clientIdentifier(request)}:${orderId}`,tenantId:order?.tenantId??orderId,limit:30,windowMs:60_000});const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';if(!order||!token||!(await verifyStoredPaymentToken(token,order)))throw new DomainError('FORBIDDEN','Payment status access is invalid or expired.',403);return ok(await reconcileOrder(repo,getPaymentProvider(),orderId,id),id)}catch(error){return fail(error,id)}}
