import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { audit } from '@/lib/services/bookings/booking-engine'
import { assertReconciliationCredential } from '@/lib/api/security'
import { fail,ok,requestId } from '@/lib/api/response'
import { enforceRateLimit } from '@/lib/rate-limit'
export async function POST(request:Request){const id=requestId(request.headers);try{assertReconciliationCredential(request);await enforceRateLimit({scope:'expire-holds',identifier:'authorized-cron',limit:6,windowMs:60_000});const repo=new FirestoreRepository(),now=new Date().toISOString(),holds=await repo.listExpiredActiveHoldsGlobal(now,100),results=[];for(const hold of holds)results.push({tenantId:hold.tenantId,holdId:hold.id,status:await repo.expireHoldAtomic(hold.tenantId,hold.id,now,audit(hold.tenantId,'SYSTEM','scheduled-hold-cleanup','HOLD_EXPIRED','HOLD',hold.id,id))});return ok({checked:holds.length,results},id)}catch(error){return fail(error,id)}}
