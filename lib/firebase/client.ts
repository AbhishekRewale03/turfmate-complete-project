'use client'
import { getApp, getApps, initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore'
import { getToken,initializeAppCheck,ReCaptchaEnterpriseProvider,type AppCheck } from 'firebase/app-check'

const config={apiKey:process.env.NEXT_PUBLIC_FIREBASE_API_KEY,authDomain:process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,projectId:process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,storageBucket:process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,messagingSenderId:process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,appId:process.env.NEXT_PUBLIC_FIREBASE_APP_ID}
let appCheck:AppCheck|undefined
export function getFirebaseClient(){const app=getApps().length?getApp():initializeApp(config);const auth=getAuth(app);const db=getFirestore(app);const emulators=process.env.NODE_ENV==='development'&&process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS==='true';if(emulators&&typeof window!=='undefined'&&!window.__turfmateEmulators){connectAuthEmulator(auth,'http://127.0.0.1:9099',{disableWarnings:true});connectFirestoreEmulator(db,'127.0.0.1',8080);window.__turfmateEmulators=true}const siteKey=process.env.NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY;if(typeof window!=='undefined'&&!emulators&&siteKey&&!appCheck)appCheck=initializeAppCheck(app,{provider:new ReCaptchaEnterpriseProvider(siteKey),isTokenAutoRefreshEnabled:true});return{app,auth,db,appCheck}}
export async function getFirebaseAppCheckToken(){const instance=getFirebaseClient().appCheck;return instance?(await getToken(instance)).token:undefined}
declare global{interface Window{__turfmateEmulators?:boolean}}
