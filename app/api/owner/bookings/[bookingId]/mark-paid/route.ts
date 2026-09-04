import { FieldValue } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { requireOwner } from '@/lib/auth/session'
import { assertOrigin } from '@/lib/api/security'
import { fail,ok,requestId } from '@/lib/api/response'
import { DomainError } from '@/lib/domain/errors'
export async function POST(request:Request,{params}:{params:Promise<{bookingId:string}>}){const id=requestId(request.headers);try{assertOrigin(request);const {tenantId,uid}=await requireOwner('payments:manage');const bookingId=(await params).bookingId;const db=adminDb();await db.runTransaction(async tx=>{const ref=db.doc(`tenants/${tenantId}/bookings/${bookingId}`);const snap=await tx.get(ref);if(!snap.exists)throw new DomainError('BOOKING_NOT_FOUND','Booking not found.',404);const balance=Number(snap.data()?.balanceDue??0);tx.update(ref,{amountPaid:FieldValue.increment(balance),balanceDue:0,paymentStatus:'PAID',paymentMethod:'CASH',updatedAt:FieldValue.serverTimestamp()});tx.create(db.collection(`tenants/${tenantId}/auditLogs`).doc(),{tenantId,actorType:'USER',actorId:uid,action:'BALANCE_MARKED_PAID',entityType:'BOOKING',entityId:bookingId,requestId:id,after:{amount:balance},createdAt:FieldValue.serverTimestamp()})});return ok({bookingId,paymentStatus:'PAID'},id)}catch(error){return fail(error,id)}}
