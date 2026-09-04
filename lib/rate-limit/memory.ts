import type { RateLimiter,RateLimitResult } from './types'

export class MemoryRateLimiter implements RateLimiter{
 private attempts=new Map<string,{count:number;resetAt:number}>()
 async consume(keyHash:string,limit:number,windowMs:number,now=Date.now()):Promise<RateLimitResult>{
  const current=this.attempts.get(keyHash)
  const item=!current||current.resetAt<=now?{count:1,resetAt:now+windowMs}:{count:current.count+1,resetAt:current.resetAt}
  this.attempts.set(keyHash,item)
  return{allowed:item.count<=limit,remaining:Math.max(0,limit-item.count),retryAfterSeconds:Math.max(1,Math.ceil((item.resetAt-now)/1000)),resetAt:item.resetAt}
 }
 clear(){this.attempts.clear()}
}
