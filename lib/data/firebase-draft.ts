'use client'
import type { PublicDraft } from '@/lib/api/client'

const draftKey=(slug:string)=>`turfmate:firebase:draft:${slug}`
export function readFirebaseDraft(slug:string):PublicDraft|undefined{try{return JSON.parse(sessionStorage.getItem(draftKey(slug))??'null')??undefined}catch{return undefined}}
export function saveFirebaseDraft(slug:string,draft:PublicDraft){sessionStorage.setItem(draftKey(slug),JSON.stringify(draft))}
export function paymentTokenKey(orderId:string){return`turfmate:firebase:payment:${orderId}`}
export function bookingTokenKey(bookingId:string){return`turfmate:firebase:booking:${bookingId}`}
export function customerSessionId(){const key='turfmate:firebase:customer-session',old=sessionStorage.getItem(key);if(old)return old;const value=crypto.randomUUID();sessionStorage.setItem(key,value);return value}
