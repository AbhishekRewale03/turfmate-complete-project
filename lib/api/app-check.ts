import 'server-only'
import { getAppCheck } from 'firebase-admin/app-check'
import { getAdminApp } from '@/lib/firebase/admin'
import { applyAppCheckPolicy,type AppCheckMode } from './app-check-policy'
export async function verifyAppCheck(request:Request){const testMode=process.env.APP_ENV==='test'?request.headers.get('x-turfmate-test-app-check-mode'):null;const mode=(testMode??process.env.APP_CHECK_MODE??'disabled') as AppCheckMode;const token=request.headers.get('x-firebase-appcheck');const result=await applyAppCheckPolicy(mode,token,async value=>{await getAppCheck(getAdminApp()).verifyToken(value)});if(mode==='monitor'&&!result.valid)console.warn(JSON.stringify({level:'warn',event:token?'app_check_invalid':'app_check_missing'}));return result}
