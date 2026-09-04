import { adminDb } from '@/lib/firebase/admin'
import { requireOwner } from '@/lib/auth/session'
import { fail,ok,requestId } from '@/lib/api/response'
import { serializeFirestore } from '@/lib/api/owner-data'
import type { ServerBooking } from '@/lib/domain/backend-types'
import { addMinutes,localDate,zonedDateTime } from '@/lib/domain/time'
export async function GET(request:Request){const id=requestId(request.headers);try{const {tenantId}=await requireOwner('bookings:read'),db=adminDb(),tenant=await db.doc(`tenants/${tenantId}`).get(),timezone=tenant.data()?.timezone??'Asia/Kolkata',start=zonedDateTime(localDate(new Date().toISOString(),timezone),0,timezone),end=addMinutes(start,1_440);const snap=await db.collection(`tenants/${tenantId}/bookings`).where('startAt','>=',start).where('startAt','<',end).orderBy('startAt').limit(100).get();const bookings=snap.docs.map(d=>serializeFirestore<ServerBooking>({id:d.id,...d.data()}));return ok({today:bookings,confirmed:bookings.filter(b=>b.bookingStatus==='CONFIRMED').length,revenue:bookings.reduce((sum,b)=>sum+b.amountPaid,0),outstanding:bookings.reduce((sum,b)=>sum+b.balanceDue,0)},id)}catch(error){return fail(error,id)}}
