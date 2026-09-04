import { adminDb } from '@/lib/firebase/admin'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPaymentProvider } from '@/lib/payments/factory'
import { reconcileRefund } from '@/lib/services/cancellations/cancellation-service'
import { fail,ok,requestId } from '@/lib/api/response'
import { assertReconciliationCredential } from '@/lib/api/security'
import { DomainError } from '@/lib/domain/errors'
import { enforceRateLimit } from '@/lib/rate-limit'

export async function POST(request:Request){
 const id=requestId(request.headers)
 try{
  assertReconciliationCredential(request)
  await enforceRateLimit({scope:'reconcile-refunds',identifier:'authorized-cron',limit:6,windowMs:60_000})
  const db=adminDb()
  const snapshots=await Promise.all(['REQUESTED','PENDING','FAILED'].map(status=>db.collection('refunds').where('status','==',status).orderBy('updatedAt').limit(25).get()))
  const ids=[...new Set(snapshots.flatMap(snapshot=>snapshot.docs.map(doc=>doc.id)))]
  const repo=new FirestoreRepository()
  const provider=getPaymentProvider()
  const results=[]
  for(const refundId of ids){
   try{results.push(await reconcileRefund(repo,provider,refundId))}
   catch(error){results.push({refundId,status:'RETRY_REQUIRED',code:error instanceof DomainError?error.code:'INTERNAL_ERROR'})}
  }
  return ok({checked:ids.length,results},id)
 }catch(error){return fail(error,id)}
}
