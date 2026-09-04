import { beforeEach,describe,expect,it } from 'vitest'
import { MemoryRepository } from '../../lib/repositories/memory/memory-repository'
import { createManualBooking,createServerHold } from '../../lib/services/bookings/booking-engine'
import type { BookingContext } from '../../lib/repositories/contracts'
import { zonedDateTime } from '../../lib/domain/time'

process.env.BOOKING_LOOKUP_HMAC_SECRET='unit-test-secret-that-is-at-least-32-characters'

const futureDate=()=>{const value=new Date(Date.now()+2*86400000);return value.toISOString().slice(0,10)}
const context=(tenantId='tenant-a',slug='arena-a'):BookingContext=>({tenant:{id:tenantId,slug,legalName:'Arena Pvt Ltd',displayName:'Arena',status:'ACTIVE',timezone:'Asia/Kolkata',createdAt:'',updatedAt:''},turf:{tenantId,turfId:'turf-1',slug,name:'Arena',shortName:'Arena',address:'Address',locality:'City',mapUrl:'',phone:'919999999999',whatsapp:'919999999999',sports:['Football'],amenities:[],timezone:'Asia/Kolkata',branding:{},isBookingEnabled:true},settings:{paymentMode:'FULL',advanceValue:100,minDurationMinutes:60,maxDurationMinutes:180,slotIntervalMinutes:30,cancellationEnabled:true,cancellationCutoffHours:4,bookingWindowDays:365,holdDurationMinutes:10},hours:Array.from({length:7},(_,weekday)=>({weekday,closed:false,openMinute:0,closeMinute:1440})),pricingRules:[{id:'base',tenantId,turfId:'turf-1',days:[0,1,2,3,4,5,6],startTime:0,endTime:1440,hourlyRate:1200,currency:'INR',priority:1}]})

describe('authoritative booking concurrency',()=>{
 let repo:MemoryRepository
 beforeEach(()=>{repo=new MemoryRepository();repo.seed(context())})
 it('allows exactly one of two simultaneous holds for one slot',async()=>{const startAt=zonedDateTime(futureDate(),19*60,'Asia/Kolkata');const attempts=await Promise.allSettled([createServerHold(repo,context(),{startAt,durationMinutes:60,customerSessionId:'customer-session-0001',requestId:'r1'}),createServerHold(repo,context(),{startAt,durationMinutes:60,customerSessionId:'customer-session-0002',requestId:'r2'})]);expect(attempts.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(attempts.filter(x=>x.status==='rejected')).toHaveLength(1);expect(repo.holds.size).toBe(1);expect(repo.locks.size).toBe(2)})
 it('isolates identical clock times between tenants',async()=>{const other=context('tenant-b','arena-b');repo.seed(other);const startAt=zonedDateTime(futureDate(),20*60,'Asia/Kolkata');await Promise.all([createServerHold(repo,context(),{startAt,durationMinutes:60,customerSessionId:'customer-session-0001',requestId:'r1'}),createServerHold(repo,other,{startAt,durationMinutes:60,customerSessionId:'customer-session-0002',requestId:'r2'})]);expect(repo.holds.size).toBe(2);expect(repo.locks.size).toBe(4)})
 it('manual and online bookings compete through the same locks',async()=>{const startAt=zonedDateTime(futureDate(),21*60,'Asia/Kolkata');await createManualBooking(repo,context(),{startAt,durationMinutes:60,customerName:'Owner Guest',customerPhone:'919999999999',paymentStatus:'CASH',actorId:'owner-1',requestId:'r1'});await expect(createServerHold(repo,context(),{startAt,durationMinutes:60,customerSessionId:'customer-session-0001',requestId:'r2'})).rejects.toMatchObject({code:'SLOT_CONFLICT'});expect(repo.bookings.size).toBe(1)})
})
