import { OwnerSettings } from '@/components/owner/owner-pages'
import { FirebaseOwnerSettings } from '@/components/owner/firebase-owner-pages'
export default function Page(){return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerSettings kind="demo"/>:<OwnerSettings kind="demo"/>}
