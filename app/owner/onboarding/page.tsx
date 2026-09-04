import { OwnerOnboarding } from '@/components/owner/owner-pages'
import { FirebaseOwnerOnboarding } from '@/components/owner/firebase-owner-pages'
export default function Page(){return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerOnboarding/>:<OwnerOnboarding/>}
