import { OwnerCalendar } from '@/components/owner/owner-pages'
import { FirebaseOwnerCalendar } from '@/components/owner/firebase-owner-pages'
export default function Page(){return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerCalendar/>:<OwnerCalendar/>}
