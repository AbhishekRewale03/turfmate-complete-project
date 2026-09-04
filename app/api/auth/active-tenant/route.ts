import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { requireOwner } from '@/lib/auth/session'
import { assertOrigin } from '@/lib/api/security'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { DomainError } from '@/lib/domain/errors'
export async function POST(request:Request){const id=requestId(request.headers);try{assertOrigin(request);const {uid}=await requireOwner();const {tenantId}=z.object({tenantId:z.string().min(1).max(128)}).strict().parse(await limitedJson(request));const member=await adminDb().doc(`tenants/${tenantId}/members/${uid}`).get();if(!member.exists||member.data()?.status!=='ACTIVE')throw new DomainError('FORBIDDEN','You do not have access to that workspace.',403);const response=ok({tenantId},id);response.cookies.set('turfmate_active_tenant',tenantId,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',path:'/',maxAge:Number(process.env.SESSION_COOKIE_MAX_AGE??432000)});return response}catch(error){return fail(error,id)}}
