import { adminDb } from '@/lib/firebase/admin'
import { requireOwner } from '@/lib/auth/session'
import { fail,ok,requestId } from '@/lib/api/response'
import { serializeFirestore } from '@/lib/api/owner-data'
import type { PaymentOrder } from '@/lib/domain/backend-types'
export async function GET(request:Request){const id=requestId(request.headers);try{const{tenantId}=await requireOwner('payments:manage');const snap=await adminDb().collection(`tenants/${tenantId}/paymentAttempts`).where('paymentCollectionMode','==','MANUAL_UPI').where('status','==','PAYMENT_PENDING').orderBy('paymentClaimedAt','desc').limit(50).get();return ok(snap.docs.map(d=>serializeFirestore<PaymentOrder>({merchantOrderId:d.id,...d.data()})),id)}catch(error){return fail(error,id)}}
