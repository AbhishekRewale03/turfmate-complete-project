import { requireOwner } from '@/lib/auth/session'
import { fail,ok,requestId } from '@/lib/api/response'
export async function GET(request:Request){const id=requestId(request.headers);try{const auth=await requireOwner();return ok({uid:auth.uid,tenantId:auth.tenantId,role:auth.member.role,permissions:auth.member.permissions},id)}catch(error){return fail(error,id)}}
