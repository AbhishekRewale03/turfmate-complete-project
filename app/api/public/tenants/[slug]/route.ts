import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { fail,ok,requestId } from '@/lib/api/response'
import { slugSchema } from '@/lib/domain/schemas'
import { DomainError } from '@/lib/domain/errors'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){const id=requestId(request.headers);try{const slug=slugSchema.parse((await params).slug);await verifyAppCheck(request);await enforceRateLimit({scope:'public-turf',identifier:clientIdentifier(request),tenantId:slug,limit:60,windowMs:60_000,failMode:'open'});const turf=await new FirestoreRepository().resolvePublicTurf(slug);if(!turf)throw new DomainError('TURF_NOT_FOUND','Turf not found.',404);return ok(turf,id)}catch(error){return fail(error,id)}}
