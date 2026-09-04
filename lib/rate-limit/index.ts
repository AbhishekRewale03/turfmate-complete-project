import { createHash } from 'node:crypto'
import { DomainError } from '../domain/errors'
import { MemoryRateLimiter } from './memory'
import type { RateLimiter } from './types'

const memoryLimiter=new MemoryRateLimiter()
export type RateLimitPolicy={scope:string;identifier:string;tenantId?:string;limit:number;windowMs:number;failMode?:'open'|'closed'}

export function clientIdentifier(request:Request){return(request.headers.get('x-forwarded-for')?.split(',')[0]??request.headers.get('x-real-ip')??'unknown-client').trim()}
export function hashedRateLimitKey(scope:string,identifier:string,tenantId='global'){
 const values=[scope,tenantId,identifier]
 if(values.some(value=>!value||value.length>256||/[\u0000-\u001f]/.test(value)))throw new DomainError('VALIDATION_ERROR','Invalid rate-limit identifier.',400)
 return createHash('sha256').update(values.join('\u001f')).digest('hex')
}
export async function enforceRateLimit(policy:RateLimitPolicy,adapter?:RateLimiter){
 const selected=adapter??((process.env.NODE_ENV==='test'||process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS==='true')?memoryLimiter:new (await import('./firestore')).FirestoreRateLimiter())
 try{
  const result=await selected.consume(hashedRateLimitKey(policy.scope,policy.identifier,policy.tenantId),policy.limit,policy.windowMs)
  if(!result.allowed)throw new DomainError('RATE_LIMITED','Too many attempts. Please wait and try again.',429,result.retryAfterSeconds)
  return result
 }catch(error){
  if(error instanceof DomainError)throw error
  if(policy.failMode==='open'){console.error(JSON.stringify({level:'error',event:'rate_limiter_unavailable',scope:policy.scope}));return null}
  throw new DomainError('CONFIGURATION_ERROR','Request protection is temporarily unavailable.',503)
 }
}
