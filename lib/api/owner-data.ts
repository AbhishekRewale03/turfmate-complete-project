import 'server-only'
import { Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { DomainError } from '@/lib/domain/errors'

export const serializeFirestore=<T>(value:unknown):T=>JSON.parse(JSON.stringify(value,(_key,item)=>item instanceof Timestamp?item.toDate().toISOString():item)) as T
export async function primaryTurfId(tenantId:string){const tenant=await adminDb().doc(`tenants/${tenantId}`).get();const configured=tenant.data()?.primaryTurfId as string|undefined;if(configured)return configured;const turfs=await adminDb().collection(`tenants/${tenantId}/turfs`).limit(1).get();if(turfs.empty)throw new DomainError('TURF_NOT_FOUND','No turf is configured for this workspace.',404);return turfs.docs[0].id}
