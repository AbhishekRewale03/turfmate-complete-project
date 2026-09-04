'use client'
import { getFirebaseAppCheckToken } from '@/lib/firebase/client'
import type { PaymentOrder,PublicTurf,ServerBooking,ServerBookingSettings,ServerOperatingDay,ServerPricingRule } from '@/lib/domain/backend-types'

type Envelope<T>={success:boolean;data:T|null;error:{code:string;message:string}|null;requestId:string}
export class ApiClientError extends Error{constructor(public code:string,message:string,public status:number,public retryAfterSeconds?:number,public requestId?:string){super(message);this.name='ApiClientError'}}

async function request<T>(path:string,init:RequestInit={}){
 const headers=new Headers(init.headers),token=await getFirebaseAppCheckToken().catch(()=>undefined)
 if(token)headers.set('x-firebase-appcheck',token)
 if(init.body&&!headers.has('content-type'))headers.set('content-type','application/json')
 let response:Response
 try{response=await fetch(path,{...init,headers,credentials:'include',cache:'no-store'})}
 catch{throw new ApiClientError('NETWORK_ERROR','Network connection failed. Please try again.',0)}
 const body=await response.json().catch(()=>null) as Envelope<T>|null
 if(!response.ok||!body?.success)throw new ApiClientError(body?.error?.code??'INTERNAL_ERROR',body?.error?.message??'Request failed.',response.status,Number(response.headers.get('retry-after'))||undefined,body?.requestId)
 return body.data as T
}
const json=(method:string,value?:unknown):RequestInit=>({method,body:value===undefined?undefined:JSON.stringify(value)})

export type Availability={date:string;timezone?:string;slotIntervalMinutes?:number;startTimes:Array<{startAt:string;durations:Array<{minutes:number;price:number}>}>}
export type PublicDraft={turf:PublicTurf;startAt:string;durationMinutes:number;calculatedPrice:number;customerName?:string;phone?:string;email?:string}
export type PaymentOrderResult={merchantOrderId:string;paymentSessionId?:string;expiresAt:string;payableNow:number;total:number;currency:'INR';cashfreeMode:'sandbox'|'production';customerStatusToken:string;status:string;bookingId?:string;paymentCollectionMode:'MANUAL_UPI'|'CASHFREE';paymentReference?:string;upiId?:string;payeeName?:string;paymentInstructions?:string;upiUri?:string;paymentClaimedAt?:string;rejectionReason?:string}

export const api={
 public:{
  turf:(slug:string)=>request<PublicTurf>(`/api/public/tenants/${encodeURIComponent(slug)}`),
  availability:(slug:string,date:string)=>request<Availability>(`/api/public/tenants/${encodeURIComponent(slug)}/availability?date=${encodeURIComponent(date)}`),
  paymentOrder:(slug:string,input:Record<string,unknown>)=>request<PaymentOrderResult>(`/api/public/tenants/${encodeURIComponent(slug)}/payment-orders`,json('POST',input)),
  paymentStatus:(orderId:string,token:string,retry=false)=>request<{status:string;bookingId?:string;paymentCollectionMode?:'MANUAL_UPI'|'CASHFREE';rejectionReason?:string}>(`/api/public/payments/${encodeURIComponent(orderId)}/${retry?'retry':'status'}`,{method:retry?'POST':'GET',headers:{authorization:`Bearer ${token}`}}),
  claimPayment:(orderId:string,token:string,customerSessionId:string)=>request<{status:string;paymentReference?:string;paymentClaimedAt?:string}>(`/api/public/payments/${encodeURIComponent(orderId)}/claim`,{...json('POST',{customerSessionId}),headers:{authorization:`Bearer ${token}`}}),
  lookup:(bookingId:string,phone:string)=>request<{booking:ServerBooking;accessToken:string}>('/api/public/bookings/lookup',json('POST',{bookingId,phone})),
  booking:(bookingId:string,token:string)=>request<ServerBooking>(`/api/public/bookings/${encodeURIComponent(bookingId)}`,{headers:{authorization:`Bearer ${token}`}}),
  cancel:(bookingId:string,token:string,reason:string,idempotencyKey:string)=>request<{status:string;refundId?:string;refundStatus?:string;manualRefundRequired?:boolean}>(`/api/public/bookings/${encodeURIComponent(bookingId)}/cancel`,{...json('POST',{reason,idempotencyKey}),headers:{authorization:`Bearer ${token}`}}),
 },
 auth:{me:()=>request<{uid:string;tenantId:string;role:string;permissions:string[]}>('/api/auth/me'),logout:()=>request<{signedOut:boolean}>('/api/auth/session',{method:'DELETE'})},
 owner:{
  dashboard:()=>request<{today:ServerBooking[];confirmed:number;revenue:number;outstanding:number}>('/api/owner/dashboard'),
  bookings:(from?:string,to?:string)=>request<ServerBooking[]>(`/api/owner/bookings${from&&to?`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`:''}`),
  booking:(id:string)=>request<ServerBooking>(`/api/owner/bookings/${encodeURIComponent(id)}`),
  createBooking:(input:Record<string,unknown>)=>request<ServerBooking>('/api/owner/bookings',json('POST',input)),
  updateBooking:(id:string,input:Record<string,unknown>)=>request(`/api/owner/bookings/${encodeURIComponent(id)}`,json('PATCH',input)),
  cancelBooking:(id:string)=>request(`/api/owner/bookings/${encodeURIComponent(id)}/cancel`,{method:'POST'}),
  markPaid:(id:string)=>request(`/api/owner/bookings/${encodeURIComponent(id)}/mark-paid`,{method:'POST'}),
  paymentClaims:()=>request<PaymentOrder[]>('/api/owner/payment-claims'),
  approvePaymentClaim:(id:string)=>request<ServerBooking>(`/api/owner/payment-claims/${encodeURIComponent(id)}/approve`,{method:'POST'}),
  rejectPaymentClaim:(id:string,reason:string)=>request<PaymentOrder>(`/api/owner/payment-claims/${encodeURIComponent(id)}/reject`,json('POST',{reason})),
  blocks:()=>request<Array<{id:string;turfId:string;startAt:string;endAt:string;reason:string;notes?:string}>>('/api/owner/blocks'),
  block:(id:string)=>request<{id:string;turfId:string;startAt:string;endAt:string;reason:string;notes?:string}>(`/api/owner/blocks/${encodeURIComponent(id)}`),
  saveBlock:(input:Record<string,unknown>,id?:string)=>request(id?`/api/owner/blocks/${encodeURIComponent(id)}`:'/api/owner/blocks',json(id?'PATCH':'POST',input)),
  deleteBlock:(id:string)=>request(`/api/owner/blocks/${encodeURIComponent(id)}`,{method:'DELETE'}),
  pricing:()=>request<ServerPricingRule[]>('/api/owner/pricing'),
  savePricing:(input:Record<string,unknown>,id?:string)=>request(id?`/api/owner/pricing/${encodeURIComponent(id)}`:'/api/owner/pricing',json(id?'PATCH':'POST',input)),
  deletePricing:(id:string)=>request(`/api/owner/pricing/${encodeURIComponent(id)}`,{method:'DELETE'}),
  hours:()=>request<ServerOperatingDay[]>('/api/owner/operating-hours'),
  saveHours:(days:ServerOperatingDay[])=>request('/api/owner/operating-hours',json('PATCH',{days})),
  profile:()=>request<PublicTurf&{id:string;privateNotes?:string}>('/api/owner/turf-profile'),
  saveProfile:(input:Record<string,unknown>)=>request<PublicTurf>('/api/owner/turf-profile',json('PATCH',input)),
  settings:()=>request<ServerBookingSettings&{manualPriceOverrideEnabled?:boolean}>('/api/owner/booking-settings'),
  saveSettings:(input:Record<string,unknown>)=>request('/api/owner/booking-settings',json('PATCH',input)),
  reports:(from?:string,to?:string)=>request<Record<string,number|Record<string,number>|null>>(`/api/owner/reports${from&&to?`?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`:''}`),
 },
}
