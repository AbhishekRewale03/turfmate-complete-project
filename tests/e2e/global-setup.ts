import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue,getFirestore } from 'firebase-admin/firestore'

process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8080'
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099'
const projectId='turfmate-e2e'

async function seedTenant(db:FirebaseFirestore.Firestore,tenantId:string,slug:string,name:string,paymentCollectionMode:'CASHFREE'|'MANUAL_UPI'='CASHFREE'){
 const turfId='main',now=FieldValue.serverTimestamp(),publicTurf={tenantId,turfId,slug,name,shortName:name,address:'Mumbai, Maharashtra',locality:'Mumbai',mapUrl:'https://maps.google.com',phone:'919999999999',whatsapp:'919999999999',sports:['Football'],amenities:['Floodlights'],timezone:'Asia/Kolkata',branding:{primary:'#171717'},isBookingEnabled:true},batch=db.batch()
 batch.set(db.doc(`tenants/${tenantId}`),{id:tenantId,slug,legalName:`${name} Sports`,displayName:name,primaryTurfId:turfId,status:'ACTIVE',timezone:'Asia/Kolkata',createdAt:now,updatedAt:now})
 batch.set(db.doc(`tenants/${tenantId}/turfs/${turfId}`),{...publicTurf,id:turfId,createdAt:now,updatedAt:now})
 batch.set(db.doc(`publicTurfs/${slug}`),publicTurf)
 batch.set(db.doc(`tenants/${tenantId}/settings/booking`),{paymentMode:'PERCENTAGE',paymentCollectionMode,...(paymentCollectionMode==='MANUAL_UPI'?{manualUpi:{upiId:'arena11@upi',payeeName:`${name} Sports`,instructions:'Use the TurfMate reference while paying.'}}:{}),advanceValue:50,minDurationMinutes:60,maxDurationMinutes:180,slotIntervalMinutes:30,cancellationEnabled:true,cancellationCutoffHours:4,bookingWindowDays:60,holdDurationMinutes:10,manualPriceOverrideEnabled:true,updatedAt:now})
 for(let weekday=0;weekday<7;weekday++)batch.set(db.doc(`tenants/${tenantId}/operatingHours/${weekday}`),{weekday,closed:false,openMinute:0,closeMinute:2880,updatedAt:now})
 batch.set(db.doc(`tenants/${tenantId}/pricingRules/base`),{id:'base',tenantId,turfId,days:[0,1,2,3,4,5,6],startTime:0,endTime:2880,hourlyRate:1200,currency:'INR',priority:1,createdAt:now,updatedAt:now})
 await batch.commit()
}

export default async function globalSetup(){
 await fetch(`http://127.0.0.1:8080/emulator/v1/projects/${projectId}/databases/(default)/documents`,{method:'DELETE'})
 await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${projectId}/accounts`,{method:'DELETE'}).catch(()=>undefined)
 const app=initializeApp({projectId}),db=getFirestore(app),auth=getAuth(app)
 await seedTenant(db,'tenant-a','arena-11','Arena 11')
 await seedTenant(db,'tenant-b','arena-22','Arena 22')
 await seedTenant(db,'tenant-c','arena-upi','Arena UPI','MANUAL_UPI')
 const ownerA=await auth.createUser({email:'owner-a@example.com',password:'Password123!',emailVerified:true}),ownerB=await auth.createUser({email:'owner-b@example.com',password:'Password123!',emailVerified:true}),ownerC=await auth.createUser({email:'owner-c@example.com',password:'Password123!',emailVerified:true})
 await Promise.all([
  db.doc(`users/${ownerA.uid}`).set({email:ownerA.email,tenantIds:['tenant-a'],createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}),
  db.doc(`tenants/tenant-a/members/${ownerA.uid}`).set({uid:ownerA.uid,tenantId:'tenant-a',role:'OWNER',permissions:[],status:'ACTIVE',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}),
  db.doc(`users/${ownerB.uid}`).set({email:ownerB.email,tenantIds:['tenant-b'],createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}),
  db.doc(`tenants/tenant-b/members/${ownerB.uid}`).set({uid:ownerB.uid,tenantId:'tenant-b',role:'OWNER',permissions:[],status:'ACTIVE',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}),
  db.doc(`users/${ownerC.uid}`).set({email:ownerC.email,tenantIds:['tenant-c'],createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}),
  db.doc(`tenants/tenant-c/members/${ownerC.uid}`).set({uid:ownerC.uid,tenantId:'tenant-c',role:'OWNER',permissions:[],status:'ACTIVE',createdAt:FieldValue.serverTimestamp(),updatedAt:FieldValue.serverTimestamp()}),
 ])
}
