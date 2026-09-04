import { adminDb } from '@/lib/firebase/admin'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { reconcileOrder } from '@/lib/services/payments/payment-service'
import { fail,ok,requestId } from '@/lib/api/response'
import { assertReconciliationCredential } from '@/lib/api/security'
import { DomainError } from '@/lib/domain/errors'
import { enforceRateLimit } from '@/lib/rate-limit'
export async function POST(request:Request){const id=requestId(request.headers);try{assertReconciliationCredential(request);await enforceRateLimit({scope:'reconcile-payments',identifier:'authorized-cron',limit:6,windowMs:60_000});const db=adminDb();const snapshots=await Promise.all(['CREATED','ACTIVE','FAILED'].map(status=>db.collection('paymentOrders').where('status','==',status).orderBy('updatedAt').limit(25).get()));const ids=[...new Set(snapshots.flatMap(snapshot=>snapshot.docs.map(doc=>doc.id)))];const repo=new FirestoreRepository();const provider=getPaymentProvider();const results=[];for(const orderId of ids){try{results.push({orderId,...await reconcileOrder(repo,provider,orderId,id)})}catch(error){results.push({orderId,status:'RETRY_REQUIRED',code:error instanceof DomainError?error.code:'INTERNAL_ERROR'})}}return ok({checked:ids.length,results},id)}catch(error){return fail(error,id)}}
