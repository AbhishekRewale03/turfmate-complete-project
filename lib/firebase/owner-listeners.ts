'use client'
import { useCallback,useEffect,useState } from 'react'
import { collection,doc,limit,onSnapshot,orderBy,query,where,type QueryConstraint } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { api } from '@/lib/api/client'
import type { PaymentOrder,ServerBooking,ServerHold } from '@/lib/domain/backend-types'
import { addMinutes,zonedDateTime } from '@/lib/domain/time'
import { getFirebaseClient } from './client'

type Live<T>={data:T;loading:boolean;error:string}
const errorText=(error:unknown)=>error instanceof Error?error.message:'Realtime connection failed.'

function useTenantListener<T>(initial:T,subscribe:(tenantId:string,next:(value:T)=>void,fail:(error:unknown)=>void)=>()=>void):Live<T>{
 const [state,setState]=useState<Live<T>>({data:initial,loading:true,error:''})
 useEffect(()=>{
  let unsubscribeSnapshot:(()=>void)|undefined,cancelled=false
  const {auth}=getFirebaseClient()
  const unsubscribeAuth=onAuthStateChanged(auth,user=>{
   unsubscribeSnapshot?.();unsubscribeSnapshot=undefined
   if(!user){if(!cancelled)setState(value=>({...value,loading:false,error:'Realtime authentication is unavailable.'}));return}
   api.auth.me().then(({tenantId})=>{
    if(cancelled)return
    unsubscribeSnapshot=subscribe(tenantId,data=>setState({data,loading:false,error:''}),error=>setState(value=>({...value,loading:false,error:errorText(error)})))
   }).catch(error=>{if(!cancelled)setState(value=>({...value,loading:false,error:errorText(error)}))})
  })
  return()=>{cancelled=true;unsubscribeAuth();unsubscribeSnapshot?.()}
 },[subscribe])
 return state
}

export function useOwnerBookingsListener(options:{mode:'day';date:string;timezone:string}|{mode:'upcoming'}){
 const mode=options.mode,date=mode==='day'?options.date:'',timezone=mode==='day'?options.timezone:''
 const subscribe=useCallback((tenantId:string,next:(value:ServerBooking[])=>void,fail:(error:unknown)=>void)=>{
  const constraints:QueryConstraint[]=mode==='day'?[where('startAt','>=',zonedDateTime(date,0,timezone)),where('startAt','<',addMinutes(zonedDateTime(date,0,timezone),1_440)),orderBy('startAt'),limit(100)]:[where('startAt','>=',new Date().toISOString()),orderBy('startAt'),limit(100)]
  return onSnapshot(query(collection(getFirebaseClient().db,`tenants/${tenantId}/bookings`),...constraints),snapshot=>next(snapshot.docs.map(item=>({id:item.id,...item.data()} as ServerBooking))),fail)
 },[mode,date,timezone])
 return useTenantListener<ServerBooking[]>([],subscribe)
}

export function useOwnerBookingListener(bookingId:string){
 const subscribe=useCallback((tenantId:string,next:(value:ServerBooking|undefined)=>void,fail:(error:unknown)=>void)=>onSnapshot(doc(getFirebaseClient().db,`tenants/${tenantId}/bookings/${bookingId}`),snapshot=>next(snapshot.exists()?{id:snapshot.id,...snapshot.data()} as ServerBooking:undefined),fail),[bookingId])
 return useTenantListener<ServerBooking|undefined>(undefined,subscribe)
}

export function useActiveHoldsListener(){
 const subscribe=useCallback((tenantId:string,next:(value:ServerHold[])=>void,fail:(error:unknown)=>void)=>onSnapshot(query(collection(getFirebaseClient().db,`tenants/${tenantId}/holds`),where('status','==','ACTIVE'),where('expiresAt','>',new Date().toISOString()),orderBy('expiresAt'),limit(50)),snapshot=>next(snapshot.docs.map(item=>({id:item.id,...item.data()} as ServerHold))),fail),[])
 return useTenantListener<ServerHold[]>([],subscribe)
}

export function usePendingPaymentClaimsListener(){
 const subscribe=useCallback((tenantId:string,next:(value:PaymentOrder[])=>void,fail:(error:unknown)=>void)=>onSnapshot(query(collection(getFirebaseClient().db,`tenants/${tenantId}/paymentAttempts`),where('paymentCollectionMode','==','MANUAL_UPI'),where('status','==','PAYMENT_PENDING'),orderBy('paymentClaimedAt','desc'),limit(50)),snapshot=>next(snapshot.docs.map(item=>({merchantOrderId:item.id,...item.data()} as PaymentOrder))),fail),[])
 return useTenantListener<PaymentOrder[]>([],subscribe)
}

export function usePaymentAttentionListener(){
 const subscribe=useCallback((tenantId:string,next:(value:PaymentOrder[])=>void,fail:(error:unknown)=>void)=>onSnapshot(query(collection(getFirebaseClient().db,`tenants/${tenantId}/paymentAttempts`),where('status','==','REQUIRES_ATTENTION'),orderBy('updatedAt','desc'),limit(50)),snapshot=>next(snapshot.docs.map(item=>({merchantOrderId:item.id,...item.data()} as PaymentOrder))),fail),[])
 return useTenantListener<PaymentOrder[]>([],subscribe)
}
