import { describe,expect,it } from 'vitest'
import { DomainError } from '../../lib/domain/errors'
import { MemoryRateLimiter } from '../../lib/rate-limit/memory'
import { enforceRateLimit,hashedRateLimitKey } from '../../lib/rate-limit'
import type { RateLimiter } from '../../lib/rate-limit/types'

describe('distributed rate-limit contract',()=>{
 it('allows requests below the limit and rejects the next request with a retry window',async()=>{
  const limiter=new MemoryRateLimiter(),policy={scope:'hold',identifier:'session-a',tenantId:'tenant-a',limit:2,windowMs:1_000}
  expect((await enforceRateLimit(policy,limiter))?.remaining).toBe(1)
  expect((await enforceRateLimit(policy,limiter))?.remaining).toBe(0)
  await expect(enforceRateLimit(policy,limiter)).rejects.toMatchObject({code:'RATE_LIMITED',status:429,retryAfterSeconds:1})
 })
 it('isolates tenants and authenticated identifiers',async()=>{
  const limiter=new MemoryRateLimiter(),base={scope:'owner',limit:1,windowMs:60_000}
  await enforceRateLimit({...base,identifier:'user-a',tenantId:'tenant-a'},limiter)
  await expect(enforceRateLimit({...base,identifier:'user-a',tenantId:'tenant-a'},limiter)).rejects.toMatchObject({code:'RATE_LIMITED'})
  await expect(enforceRateLimit({...base,identifier:'user-a',tenantId:'tenant-b'},limiter)).resolves.toBeTruthy()
  await expect(enforceRateLimit({...base,identifier:'user-b',tenantId:'tenant-a'},limiter)).resolves.toBeTruthy()
 })
 it('opens a new window after reset',async()=>{
  const limiter=new MemoryRateLimiter(),key=hashedRateLimitKey('lookup','ip','tenant')
  expect((await limiter.consume(key,1,100,1_000)).allowed).toBe(true)
  expect((await limiter.consume(key,1,100,1_050)).allowed).toBe(false)
  expect((await limiter.consume(key,1,100,1_101)).allowed).toBe(true)
 })
 it('rejects malformed identifiers without exposing the raw value',()=>{
  expect(()=>hashedRateLimitKey('lookup','')).toThrow(DomainError)
  expect(hashedRateLimitKey('lookup','919999999999')).toMatch(/^[a-f0-9]{64}$/)
  expect(hashedRateLimitKey('lookup','919999999999')).not.toContain('919999999999')
 })
 it('documents fail-open availability and fail-closed sensitive behavior',async()=>{
  const unavailable:RateLimiter={consume:async()=>{throw new Error('down')}}
  await expect(enforceRateLimit({scope:'availability',identifier:'ip',limit:1,windowMs:1_000,failMode:'open'},unavailable)).resolves.toBeNull()
  await expect(enforceRateLimit({scope:'payment',identifier:'ip',limit:1,windowMs:1_000},unavailable)).rejects.toMatchObject({code:'CONFIGURATION_ERROR',status:503})
 })
})
