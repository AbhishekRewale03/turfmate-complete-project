import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { createPaymentAttempt } from '@/lib/services/payments/payment-service'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { paymentOrderRequestSchema,slugSchema } from '@/lib/domain/schemas'
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){const id=requestId(request.headers);try{const slug=slugSchema.parse((await params).slug);await verifyAppCheck(request);const body=paymentOrderRequestSchema.parse(await limitedJson(request));await enforceRateLimit({scope:'payment-order-create',identifier:`${clientIdentifier(request)}:${body.customerSessionId}`,tenantId:slug,limit:8,windowMs:60_000});const data=await createPaymentAttempt(new FirestoreRepository(),getPaymentProvider(),slug,body,id);return ok(data,id,201)}catch(error){return fail(error,id)}}
