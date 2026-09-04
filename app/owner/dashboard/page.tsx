import { OwnerDashboard } from '@/components/owner/owner-pages'
import { FirebaseOwnerDashboard } from '@/components/owner/firebase-owner-pages'
export default function Page(){return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerDashboard/>:<OwnerDashboard/>}
