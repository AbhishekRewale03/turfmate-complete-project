import { describe,expect,it } from 'vitest'
import { applyAppCheckPolicy } from '../../lib/api/app-check-policy'
import { assertReconciliationCredential } from '../../lib/api/security'

describe('App Check and reconciliation security',()=>{
 it('supports disabled and monitor modes without replacing authorization',async()=>{
  await expect(applyAppCheckPolicy('disabled',null,async()=>{throw new Error('unused')})).resolves.toEqual({valid:false,enforced:false})
  await expect(applyAppCheckPolicy('monitor','bad',async()=>{throw new Error('invalid')})).resolves.toEqual({valid:false,enforced:false})
 })
 it('returns a stable invalid-token error in enforce mode',async()=>{
  await expect(applyAppCheckPolicy('enforce',null,async()=>undefined)).rejects.toMatchObject({code:'INVALID_APP_CHECK',status:401})
  await expect(applyAppCheckPolicy('enforce','bad',async()=>{throw new Error('invalid')})).rejects.toMatchObject({code:'INVALID_APP_CHECK',status:401})
 })
 it('requires a configured matching reconciliation credential',()=>{
  process.env.CRON_SECRET='a-secure-reconciliation-secret-123456'
  expect(()=>assertReconciliationCredential(new Request('http://local'))).toThrow()
  expect(()=>assertReconciliationCredential(new Request('http://local',{headers:{authorization:'Bearer wrong'}}))).toThrow()
  expect(()=>assertReconciliationCredential(new Request('http://local',{headers:{authorization:`Bearer ${process.env.CRON_SECRET}`}}))).not.toThrow()
 })
})
