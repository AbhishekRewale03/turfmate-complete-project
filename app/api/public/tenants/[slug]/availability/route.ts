import { z } from 'zod'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { getPublicAvailability } from '@/lib/services/availability/availability-service'
import { fail,ok,requestId } from '@/lib/api/response'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { slugSchema } from '@/lib/domain/schemas'
import { DomainError } from '@/lib/domain/errors'
const dateSchema=z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
export async function GET(request:Request,{params}:{params:Promise<{slug:string}>}){const id=requestId(request.headers);try{const slug=slugSchema.parse((await params).slug);await verifyAppCheck(request);await enforceRateLimit({scope:'public-availability',identifier:clientIdentifier(request),tenantId:slug,limit:60,windowMs:60_000,failMode:'open'});const date=dateSchema.parse(new URL(request.url).searchParams.get('date'));const repo=new FirestoreRepository();const turf=await repo.resolvePublicTurf(slug);if(!turf)throw new DomainError('TURF_NOT_FOUND','Turf not found.',404);const context=await repo.getBookingContext(turf.tenantId,turf.turfId);if(!context)throw new DomainError('TURF_NOT_FOUND','Booking configuration was not found.',404);return ok(await getPublicAvailability(repo,context,date),id)}catch(error){return fail(error,id)}}
