import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { processCashfreeWebhook } from '@/lib/services/payments/payment-service'
import { fail,ok,requestId } from '@/lib/api/response'
export async function POST(request:Request){const id=requestId(request.headers);try{const raw=await request.text();const timestamp=request.headers.get('x-webhook-timestamp')??'';const signature=request.headers.get('x-webhook-signature')??'';const data=await processCashfreeWebhook(new FirestoreRepository(),getPaymentProvider(),raw,timestamp,signature,id);return ok(data,id)}catch(error){return fail(error,id)}}
