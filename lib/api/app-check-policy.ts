import { DomainError } from '../domain/errors'

export type AppCheckMode='disabled'|'monitor'|'enforce'
export async function applyAppCheckPolicy(mode:AppCheckMode,token:string|null,verify:(token:string)=>Promise<void>){
 if(mode==='disabled')return{valid:false,enforced:false}
 if(!token){
  if(mode==='enforce')throw new DomainError('INVALID_APP_CHECK','App verification is required.',401)
  return{valid:false,enforced:false}
 }
 try{await verify(token);return{valid:true,enforced:mode==='enforce'}}
 catch{if(mode==='enforce')throw new DomainError('INVALID_APP_CHECK','App verification failed.',401);return{valid:false,enforced:false}}
}
