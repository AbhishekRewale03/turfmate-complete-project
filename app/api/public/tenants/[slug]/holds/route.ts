import { z } from 'zod'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { createServerHold } from '@/lib/services/bookings/booking-engine'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { verifyAppCheck } from '@/lib/api/app-check'
import { clientIdentifier,enforceRateLimit } from '@/lib/rate-limit'
import { isoDateTimeSchema,slugSchema } from '@/lib/domain/schemas'
import { DomainError } from '@/lib/domain/errors'
const schema=z.object({turfId:z.string().min(1).max(128),startAt:isoDateTimeSchema,durationMinutes:z.number().int().positive().max(720),customerSessionId:z.string().min(16).max(128)}).strict()
export async function POST(request:Request,{params}:{params:Promise<{slug:string}>}){const id=requestId(request.headers);try{const slug=slugSchema.parse((await params).slug);await verifyAppCheck(request);const body=schema.parse(await limitedJson(request));await enforceRateLimit({scope:'hold-create',identifier:`${clientIdentifier(request)}:${body.customerSessionId}`,tenantId:slug,limit:8,windowMs:60_000});const repo=new FirestoreRepository();const turf=await repo.resolvePublicTurf(slug);if(!turf||turf.turfId!==body.turfId)throw new DomainError('TURF_NOT_FOUND','Turf not found.',404);const context=await repo.getBookingContext(turf.tenantId,turf.turfId);if(!context)throw new DomainError('TURF_NOT_FOUND','Booking configuration was not found.',404);const created=await createServerHold(repo,context,{...body,requestId:id});return ok({holdId:created.hold.id,expiresAt:created.hold.expiresAt,startAt:created.hold.startAt,endAt:created.hold.endAt,price:created.price.total,payableNow:created.payableNow,currency:'INR'},id,201)}catch(error){return fail(error,id)}}
