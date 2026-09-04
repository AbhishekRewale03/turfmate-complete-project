import { adminDb } from '@/lib/firebase/admin'
import { requireOwner } from '@/lib/auth/session'
import { FirestoreRepository } from '@/lib/repositories/firestore/firestore-repository'
import { createManualBooking } from '@/lib/services/bookings/booking-engine'
import { manualBookingSchema } from '@/lib/domain/schemas'
import { assertOrigin } from '@/lib/api/security'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { serializeFirestore } from '@/lib/api/owner-data'
import type { ServerBooking } from '@/lib/domain/backend-types'
export async function GET(request:Request){const id=requestId(request.headers);try{const {tenantId}=await requireOwner('bookings:read');const url=new URL(request.url);const from=url.searchParams.get('from')??new Date(Date.now()-30*86400000).toISOString();const to=url.searchParams.get('to')??new Date(Date.now()+90*86400000).toISOString();const snap=await adminDb().collection(`tenants/${tenantId}/bookings`).where('startAt','>=',from).where('startAt','<',to).orderBy('startAt').limit(250).get();return ok(snap.docs.map(d=>serializeFirestore<ServerBooking>({id:d.id,...d.data()})),id)}catch(error){return fail(error,id)}}
export async function POST(request:Request){const id=requestId(request.headers);try{assertOrigin(request);const auth=await requireOwner('bookings:write');const body=manualBookingSchema.parse(await limitedJson(request));const repo=new FirestoreRepository();const context=await repo.getBookingContext(auth.tenantId,body.turfId);if(!context)throw new Error('Booking context missing');return ok(await createManualBooking(repo,context,{...body,actorId:auth.uid,requestId:id}),id,201)}catch(error){return fail(error,id)}}
