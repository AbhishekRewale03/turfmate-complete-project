import { defineConfig,devices } from '@playwright/test'

const common={
 FIREBASE_PROJECT_ID:'turfmate-e2e',FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',FIREBASE_STORAGE_EMULATOR_HOST:'127.0.0.1:9199',
 NEXT_PUBLIC_FIREBASE_API_KEY:'demo-key',NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN:'turfmate-e2e.firebaseapp.com',NEXT_PUBLIC_FIREBASE_PROJECT_ID:'turfmate-e2e',NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET:'turfmate-e2e.appspot.com',NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID:'123456789',NEXT_PUBLIC_FIREBASE_APP_ID:'1:123456789:web:e2e',NEXT_PUBLIC_USE_FIREBASE_EMULATORS:'true',NEXT_PUBLIC_DATA_MODE:'firebase',
 APP_URL:'http://127.0.0.1:3100',APP_ENV:'test',APP_CHECK_MODE:'disabled',PAYMENT_PROVIDER:'mock',PAYMENT_SETTLEMENT_MODE:'PLATFORM',NEXT_PUBLIC_CASHFREE_MODE:'sandbox',BOOKING_LOOKUP_HMAC_SECRET:'e2e-booking-secret-that-is-longer-than-32-characters',CRON_SECRET:'e2e-cron-secret-that-is-longer-than-32-characters',CASHFREE_CLIENT_SECRET:'e2e-cashfree-secret',NEXT_DIST_DIR:'.next-e2e',
}

export default defineConfig({
 testDir:'./tests/e2e',fullyParallel:false,workers:1,retries:0,timeout:60_000,expect:{timeout:20_000},globalSetup:'./tests/e2e/global-setup.ts',
 use:{baseURL:'http://127.0.0.1:3100',trace:'retain-on-failure',screenshot:'only-on-failure'},
 projects:[{name:'chromium',use:{...devices['Desktop Chrome']}}],
 webServer:[
  {command:'npx firebase emulators:start --project turfmate-e2e --only auth,firestore,storage',port:8080,reuseExistingServer:true,timeout:120_000,env:common},
  {command:'npm run dev -- --hostname 127.0.0.1 --port 3100',url:'http://127.0.0.1:3100/owner/login',reuseExistingServer:false,timeout:120_000,env:common},
 ],
})
