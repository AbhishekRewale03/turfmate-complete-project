import { CustomerBookingDetails } from '@/components/customer/customer-pages'
import { FirebaseCustomerBookingDetails } from '@/components/customer/firebase-customer-pages'
export default async function Page({params}:{params:Promise<{turfSlug:string;bookingId:string}>}){const p=await params;return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseCustomerBookingDetails slug={p.turfSlug} id={p.bookingId}/>:<CustomerBookingDetails slug={p.turfSlug} id={p.bookingId}/>}
