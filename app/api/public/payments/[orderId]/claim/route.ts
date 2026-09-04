import { z } from 'zod'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { claimManualPayment,verifyStoredPaymentToken } from '@/lib/services/payments/payment-service'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { assertOrigin } from '@/lib/api/security'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { DomainError } from '@/lib/domain/errors'
const schema=z.object({customerSessionId:z.string().min(16).max(128)}).strict()
export async function POST(request:Request,{params}:{params:Promise<{orderId:string}>}){const id=requestId(request.headers);try{assertOrigin(request);const orderId=(await params).orderId.slice(0,64),body=schema.parse(await limitedJson(request));await verifyAppCheck(request);const repo=new FirestoreRepository(),order=await repo.getPaymentOrder(orderId);await enforceRateLimit({scope:'manual-payment-claim',identifier:`${clientIdentifier(request)}:${body.customerSessionId}:${orderId}`,tenantId:order?.tenantId??orderId,limit:5,windowMs:60_000});const token=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';if(!order||!token||!(await verifyStoredPaymentToken(token,order)))throw new DomainError('FORBIDDEN','Payment claim access is invalid or expired.',403);return ok(await claimManualPayment(repo,order,body.customerSessionId,id),id)}catch(error){return fail(error,id)}}
