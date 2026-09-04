import { readFileSync } from 'node:fs'
import { assertFails,initializeTestEnvironment,type RulesTestEnvironment } from '@firebase/rules-unit-testing'
import { afterAll,beforeAll,beforeEach,describe,it } from 'vitest'

const run=Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST)

describe.skipIf(!run)('Storage default-deny rules',()=>{
 let env:RulesTestEnvironment
 beforeAll(async()=>{env=await initializeTestEnvironment({projectId:'turfmate-storage-rules-test',storage:{rules:readFileSync('storage.rules','utf8')}})})
 afterAll(async()=>env.cleanup())
 beforeEach(async()=>env.clearStorage())

 it('denies anonymous reads and writes',async()=>{
  const file=env.unauthenticatedContext().storage().ref('tenant-a/private.txt')
  await assertFails(Promise.resolve(file.putString('private')))
  await assertFails(file.getDownloadURL())
 })

 it('denies authenticated reads and writes',async()=>{
  const file=env.authenticatedContext('owner-a').storage().ref('tenant-a/private.txt')
  await assertFails(Promise.resolve(file.putString('private')))
  await assertFails(file.getDownloadURL())
 })
})
