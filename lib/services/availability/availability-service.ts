import 'server-only'
import { adminDb } from '@/lib/firebase/admin'
import { addMinutes,weekday,zonedDateTime } from '@/lib/domain/time'
import { calculateAuthoritativePrice } from '@/lib/services/bookings/booking-engine'
import type { BookingContext,AuthoritativeRepository } from '@/lib/repositories/contracts'
import type { SlotLock } from '@/lib/domain/backend-types'
import { audit } from '@/lib/services/bookings/booking-engine'

export async function getPublicAvailability(repo:AuthoritativeRepository,context:BookingContext,date:string){
 const now=new Date().toISOString()
 const expired=await repo.listExpiredActiveHolds(context.tenant.id,context.turf.turfId,now,25)
 for(const hold of expired)await repo.expireHoldAtomic(hold.tenantId,hold.id,now,audit(hold.tenantId,'SYSTEM','availability-cleanup','HOLD_EXPIRED','HOLD',hold.id,crypto.randomUUID()))
 const day=context.hours.find(item=>item.weekday===weekday(date))
 if(!day||day.closed)return{date,startTimes:[]}
 const open=zonedDateTime(date,day.openMinute,context.turf.timezone)
 const close=zonedDateTime(date,day.closeMinute,context.turf.timezone)
 const locks=await adminDb().collection(`tenants/${context.tenant.id}/slotLocks`).where('turfId','==',context.turf.turfId).where('slotStartAt','>=',open).where('slotStartAt','<',close).get()
 const busy=new Set(locks.docs.map(doc=>(doc.data() as SlotLock).slotStartAt))
 const startTimes=[]
 for(let start=open;new Date(start)<new Date(close);start=addMinutes(start,context.settings.slotIntervalMinutes)){
  if(new Date(start)<new Date()||busy.has(start))continue
  const durations=[]
  for(let minutes=context.settings.minDurationMinutes;minutes<=context.settings.maxDurationMinutes;minutes+=context.settings.slotIntervalMinutes){
   const end=addMinutes(start,minutes);if(new Date(end)>new Date(close))break
   let conflict=false;for(let cursor=start;new Date(cursor)<new Date(end);cursor=addMinutes(cursor,context.settings.slotIntervalMinutes))if(busy.has(cursor)){conflict=true;break}
   if(!conflict){try{durations.push({minutes,price:calculateAuthoritativePrice(context,start,end).total})}catch{break}}
  }
  if(durations.length)startTimes.push({startAt:start,durations})
 }
 return{date,timezone:context.turf.timezone,slotIntervalMinutes:context.settings.slotIntervalMinutes,startTimes}
}
