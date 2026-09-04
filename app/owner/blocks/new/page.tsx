import { OwnerBlockForm } from '@/components/owner/owner-pages'
import { FirebaseOwnerBlockForm } from '@/components/owner/firebase-owner-pages'
export default function Page(){return process.env.NEXT_PUBLIC_DATA_MODE==='firebase'?<FirebaseOwnerBlockForm/>:<OwnerBlockForm/>}
