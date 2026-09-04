import { OwnerBookingDetail } from '@/components/owner/owner-pages'
import { FirebaseOwnerBookingDetail } from '@/components/owner/firebase-owner-pages'
export default async function Page({params}:{params:Promise<{bookingId:string}>}){const id=(await params).bookingId;return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerBookingDetail id={id}/>:<OwnerBookingDetail id={id}/>}
