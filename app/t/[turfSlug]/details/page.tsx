import { CustomerDetails } from '@/components/customer/customer-pages'
import { FirebaseCustomerDetails } from '@/components/customer/firebase-customer-pages'
export default async function Page({params}:{params:Promise<{turfSlug:string}>}){const slug=(await params).turfSlug;return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseCustomerDetails slug={slug}/>:<CustomerDetails slug={slug}/>}
