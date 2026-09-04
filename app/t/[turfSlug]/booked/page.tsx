import { CustomerLookup } from '@/components/customer/customer-pages'
import { FirebaseCustomerLookup } from '@/components/customer/firebase-customer-pages'
export default async function Page({params}:{params:Promise<{turfSlug:string}>}){const slug=(await params).turfSlug;return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseCustomerLookup slug={slug}/>:<CustomerLookup slug={slug}/>}
