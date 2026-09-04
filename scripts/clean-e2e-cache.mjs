import { rm } from 'node:fs/promises'
import { dirname,resolve } from 'node:path'

const workspace=resolve(process.cwd())
const target=resolve(workspace,'.next-e2e')

if(dirname(target)!==workspace)throw new Error('Refusing to clean an E2E cache outside the project directory.')
await rm(target,{recursive:true,force:true,maxRetries:5,retryDelay:200})
