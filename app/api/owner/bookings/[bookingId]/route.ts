import { FieldValue } from 'firebase-admin/firestore'
import { z } from 'zod'
import { adminDb } from '@/lib/firebase/admin'
import { requireOwner } from '@/lib/auth/session'
import { assertOrigin } from '@/lib/api/security'
import { fail,limitedJson,ok,requestId } from '@/lib/api/response'
import { serializeFirestore } from '@/lib/api/owner-data'
import { DomainError } from '@/lib/domain/errors'
const patchSchema=z.object({notes:z.string().max(1000).optional(),customerName:z.string().trim().min(2).max(100).optional(),customerEmail:z.string().email().max(254).optional()}).strict()
export async function GET(request:Request,{params}:{params:Promise<{bookingId:string}>}){const id=requestId(request.headers);try{const {tenantId}=await requireOwner('bookings:read');const bookingId=(await params).bookingId;const snap=await adminDb().doc(`tenants/${tenantId}/bookings/${bookingId}`).get();if(!snap.exists)throw new DomainError('BOOKING_NOT_FOUND','Booking not found.',404);return ok(serializeFirestore({id:snap.id,...snap.data()}),id)}catch(error){return fail(error,id)}}
export async function PATCH(request:Request,{params}:{params:Promise<{bookingId:string}>}){const id=requestId(request.headers);try{assertOrigin(request);const {tenantId}=await requireOwner('bookings:write');const bookingId=(await params).bookingId;const changes=patchSchema.parse(await limitedJson(request));const ref=adminDb().doc(`tenants/${tenantId}/bookings/${bookingId}`);if(!(await ref.get()).exists)throw new DomainError('BOOKING_NOT_FOUND','Booking not found.',404);await ref.update({...changes,updatedAt:FieldValue.serverTimestamp()});return ok({bookingId,updated:true},id)}catch(error){return fail(error,id)}}
