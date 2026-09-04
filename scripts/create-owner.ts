import { applicationDefault,cert,getApps,initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue,getFirestore } from 'firebase-admin/firestore'

async function main(){
const args=new Map(process.argv.slice(2).map(value=>{const [key,...rest]=value.split('=');return[key,rest.join('=')]}))
if(process.env.APP_ENV==='production'&&!args.has('--confirm-production'))throw new Error('Refusing to create a production owner without --confirm-production=true')
const email=args.get('--email')||process.env.OWNER_EMAIL
const password=process.env.OWNER_PASSWORD
const tenantId=args.get('--tenant')
if(!email||!password||!tenantId)throw new Error('Provide --email=owner@example.com --tenant=tenant-id and OWNER_PASSWORD in the environment.')
const projectId=process.env.FIREBASE_PROJECT_ID??'turfmate-demo'
const credential=process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY?cert({projectId,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')}):applicationDefault()
const app=getApps()[0]??initializeApp({projectId,credential})
const auth=getAuth(app);const db=getFirestore(app)
let user;try{user=await auth.getUserByEmail(email)}catch{user=await auth.createUser({email,password,emailVerified:false,disabled:false})}
const now=FieldValue.serverTimestamp()
await Promise.all([db.doc(`users/${user.uid}`).set({email,tenantIds:FieldValue.arrayUnion(tenantId),updatedAt:now,createdAt:now},{merge:true}),db.doc(`tenants/${tenantId}/members/${user.uid}`).set({uid:user.uid,tenantId,role:'OWNER',permissions:[],status:'ACTIVE',createdAt:now,updatedAt:now},{merge:true})])
console.log(JSON.stringify({created:true,uid:user.uid,email,tenantId,verificationRequired:!user.emailVerified}))
}
main().catch(error=>{console.error(error instanceof Error?error.message:'Owner creation failed');process.exitCode=1})
