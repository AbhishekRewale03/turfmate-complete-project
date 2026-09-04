import { CustomerSuccess } from '@/components/customer/customer-pages'
import { FirebaseCustomerSuccess } from '@/components/customer/firebase-customer-pages'
export default async function Page({params}:{params:Promise<{turfSlug:string;bookingId:string}>}){const p=await params;return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseCustomerSuccess slug={p.turfSlug} id={p.bookingId}/>:<CustomerSuccess slug={p.turfSlug} id={p.bookingId}/>}
