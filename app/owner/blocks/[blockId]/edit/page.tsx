import { OwnerBlockForm } from '@/components/owner/owner-pages'
import { FirebaseOwnerBlockForm } from '@/components/owner/firebase-owner-pages'
export default async function Page({params}:{params:Promise<{blockId:string}>}){const id=(await params).blockId;return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerBlockForm id={id}/>:<OwnerBlockForm id={id}/>}
