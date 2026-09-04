import { applicationDefault,cert,getApps,initializeApp } from 'firebase-admin/app'
import { FieldValue,getFirestore } from 'firebase-admin/firestore'

async function main(){
const args=new Map(process.argv.slice(2).map(value=>{const [key,...rest]=value.split('=');return[key,rest.join('=')]}))
if(process.env.APP_ENV==='production'&&!args.has('--confirm-production'))throw new Error('Refusing to seed production without --confirm-production=true')
const projectId=process.env.FIREBASE_PROJECT_ID??'turfmate-demo'
const credential=process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY?cert({projectId,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')}):applicationDefault()
const app=getApps()[0]??initializeApp({projectId,credential})
const db=getFirestore(app)
const tenantId=args.get('--tenant')||'arena-11'
const slug=args.get('--slug')||'arena-11'
const turfId='main'
const now=FieldValue.serverTimestamp()
const publicTurf={tenantId,turfId,slug,name:'Arena 11',shortName:'Arena 11',address:'Mumbai, Maharashtra',locality:'Mumbai',mapUrl:'https://maps.google.com',phone:'919999999999',whatsapp:'919999999999',sports:['Football','Cricket'],amenities:['Floodlights','Parking'],timezone:'Asia/Kolkata',branding:{primary:'#171717'},isBookingEnabled:true}
const batch=db.batch()
batch.set(db.doc(`tenants/${tenantId}`),{id:tenantId,slug,legalName:'Arena 11 Sports',displayName:'Arena 11',primaryTurfId:turfId,status:'ACTIVE',timezone:'Asia/Kolkata',createdAt:now,updatedAt:now},{merge:true})
batch.set(db.doc(`tenants/${tenantId}/turfs/${turfId}`),{...publicTurf,id:turfId,createdAt:now,updatedAt:now},{merge:true})
batch.set(db.doc(`publicTurfs/${slug}`),publicTurf)
batch.set(db.doc(`tenants/${tenantId}/settings/booking`),{paymentMode:'PERCENTAGE',paymentCollectionMode:'CASHFREE',advanceValue:50,minDurationMinutes:60,maxDurationMinutes:180,slotIntervalMinutes:30,cancellationEnabled:true,cancellationCutoffHours:4,bookingWindowDays:60,holdDurationMinutes:10,updatedAt:now},{merge:true})
for(let weekday=0;weekday<7;weekday++)batch.set(db.doc(`tenants/${tenantId}/operatingHours/${weekday}`),{weekday,closed:false,openMinute:360,closeMinute:1560,updatedAt:now},{merge:true})
batch.set(db.doc(`tenants/${tenantId}/pricingRules/base`),{id:'base',tenantId,turfId,days:[0,1,2,3,4,5,6],startTime:0,endTime:1440,hourlyRate:1200,currency:'INR',priority:1,createdAt:now,updatedAt:now},{merge:true})
batch.set(db.doc(`tenants/${tenantId}/pricingRules/late`),{id:'late',tenantId,turfId,days:[0,1,2,3,4,5,6],startTime:1080,endTime:1440,hourlyRate:1600,currency:'INR',priority:2,createdAt:now,updatedAt:now},{merge:true})
await batch.commit()
console.log(JSON.stringify({seeded:true,projectId,tenantId,slug}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Seed failed');process.exitCode=1})
