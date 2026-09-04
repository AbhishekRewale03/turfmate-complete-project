import { timingSafeEqual } from 'node:crypto'
import { DomainError } from '../domain/errors'
export function assertOrigin(request:Request){const expected=new URL(process.env.APP_URL??'http://localhost:3000').origin;const origin=request.headers.get('origin');if(origin&&origin!==expected)throw new DomainError('FORBIDDEN','Request origin is not allowed.',403)}
export function safeEqual(a:string,b:string){const aa=Buffer.from(a);const bb=Buffer.from(b);return aa.length===bb.length&&timingSafeEqual(aa,bb)}
export function assertReconciliationCredential(request:Request){const expected=process.env.CRON_SECRET??'',supplied=request.headers.get('authorization')?.replace(/^Bearer\s+/i,'')??'';if(expected.length<32||!safeEqual(expected,supplied))throw new DomainError('FORBIDDEN','Reconciliation authorization failed.',403)}
