import { OwnerLogin } from '@/components/owner/owner-pages'
import { FirebaseOwnerLogin } from '@/components/owner/firebase-owner-login'
export default function Page(){return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerLogin/>:<OwnerLogin/>}
