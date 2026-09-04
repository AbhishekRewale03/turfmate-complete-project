import type { OwnerSession, TenantData } from '@/lib/domain/types'
import { createSeedData } from './seeds'

const INDEX = 'turfmate:v1:tenants'
const SESSION = 'turfmate:v1:owner-session'
const key = (id: string) => `turfmate:v1:tenant:${id}`

export type RepositorySnapshot = { tenants: Record<string, TenantData>; session: OwnerSession; hydrated: boolean; recoveryMessage?: string }

export function loadRepository(): RepositorySnapshot {
  const seeds = createSeedData()
  if (typeof window === 'undefined') return { tenants: seeds, session: null, hydrated: false }
  try {
    const ids = JSON.parse(localStorage.getItem(INDEX) ?? 'null') as string[] | null
    if (!Array.isArray(ids)) { persistAll(seeds); return { tenants: seeds, session: readSession(), hydrated: true } }
    const stored = Object.fromEntries(ids.map(id => [id, JSON.parse(localStorage.getItem(key(id)) ?? 'null')]).filter(([, value]) => value)) as Record<string, TenantData>
    const tenants = { ...seeds, ...stored }
    if (Object.keys(stored).length !== Object.keys(tenants).length) persistAll(tenants)
    if (!Object.keys(tenants).length) throw new Error('No valid workspaces')
    return { tenants, session: readSession(), hydrated: true }
  } catch {
    persistAll(seeds)
    return { tenants: seeds, session: null, hydrated: true, recoveryMessage: 'Local demo data was repaired.' }
  }
}

const readSession = (): OwnerSession => { try { return JSON.parse(localStorage.getItem(SESSION) ?? 'null') } catch { return null } }
export function persistAll(tenants: Record<string, TenantData>) { localStorage.setItem(INDEX, JSON.stringify(Object.keys(tenants))); Object.values(tenants).forEach(t => localStorage.setItem(key(t.tenant.id), JSON.stringify(t))) }
export function persistTenant(data: TenantData) { const ids = JSON.parse(localStorage.getItem(INDEX) ?? '[]') as string[]; localStorage.setItem(INDEX, JSON.stringify([...new Set([...ids, data.tenant.id])])) ; localStorage.setItem(key(data.tenant.id), JSON.stringify(data)) }
export function persistSession(session: OwnerSession) { if (session) localStorage.setItem(SESSION, JSON.stringify(session)); else localStorage.removeItem(SESSION) }
export const storageKeys = { INDEX, SESSION }
