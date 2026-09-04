import 'server-only'
import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

let database:ReturnType<typeof getFirestore>|undefined

function credential(){if(process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)return cert({projectId:process.env.FIREBASE_PROJECT_ID,clientEmail:process.env.FIREBASE_CLIENT_EMAIL,privateKey:process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g,'\n')});return applicationDefault()}
export function getAdminApp(){return getApps()[0]??initializeApp({credential:credential(),projectId:process.env.FIREBASE_PROJECT_ID,storageBucket:process.env.FIREBASE_STORAGE_BUCKET})}
export const adminAuth=()=>getAuth(getAdminApp())
export const adminDb=()=>{if(!database){database=getFirestore(getAdminApp());database.settings({ignoreUndefinedProperties:true})}return database}
