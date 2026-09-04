import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import type { RateLimiter } from './types'

export class FirestoreRateLimiter implements RateLimiter{
 async consume(keyHash:string,limit:number,windowMs:number,now=Date.now()){
  const db=adminDb(),ref=db.doc(`rateLimits/${keyHash}`)
  return db.runTransaction(async tx=>{
   const snap=await tx.get(ref),data=snap.data() as {count?:number;resetAt?:number}|undefined
   const resetAt=!data?.resetAt||data.resetAt<=now?now+windowMs:data.resetAt
   const count=!data?.resetAt||data.resetAt<=now?1:(data.count??0)+1
   tx.set(ref,{count,resetAt,updatedAt:FieldValue.serverTimestamp()})
   return{allowed:count<=limit,remaining:Math.max(0,limit-count),retryAfterSeconds:Math.max(1,Math.ceil((resetAt-now)/1000)),resetAt}
  })
 }
}
