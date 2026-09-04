import { randomBytes } from 'node:crypto'
import { cookies } from 'next/headers'
import { createOwnerSession,sessionCookieName } from '@/lib/auth/session'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { assertOrigin,safeEqual } from '@/lib/api/security'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { sessionRequestSchema } from '@/lib/domain/schemas'
import { DomainError } from '@/lib/domain/errors'

const csrfCookie='turfmate_csrf'

export async function GET(request:Request){const id=requestId(request.headers);const token=randomBytes(32).toString('base64url');const response=ok({csrfToken:token},id);response.cookies.set(csrfCookie,token,{httpOnly:true,sameSite:'strict',secure:process.env.NODE_ENV==='production',path:'/',maxAge:600});return response}
export async function POST(request:Request){const id=requestId(request.headers);try{assertOrigin(request);await enforceRateLimit({scope:'session-exchange',identifier:clientIdentifier(request),limit:10,windowMs:60_000});const body=sessionRequestSchema.parse(await limitedJson(request));const csrf=(await cookies()).get(csrfCookie)?.value;if(!csrf||!safeEqual(csrf,body.csrfToken))throw new DomainError('FORBIDDEN','Security token expired. Refresh and try again.',403);const session=await createOwnerSession(body.idToken);const response=ok({uid:session.uid,tenantId:session.tenantId},id);response.cookies.set(sessionCookieName(),session.cookie,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:session.maxAge});response.cookies.set('turfmate_active_tenant',session.tenantId,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:session.maxAge});response.cookies.delete(csrfCookie);return response}catch(error){return fail(error,id)}}
export async function DELETE(request:Request){const id=requestId(request.headers);try{assertOrigin(request);const response=ok({signedOut:true},id);response.cookies.delete(sessionCookieName());response.cookies.delete('turfmate_active_tenant');return response}catch(error){return fail(error,id)}}
