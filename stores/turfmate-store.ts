'use client'

import { useSyncExternalStore } from 'react'
import type { Booking, BookingDraft, Block, Hold, OwnerSession, TenantData } from '@/lib/domain/types'
import { createSeedData } from '@/lib/data/seeds'
import { loadRepository, persistAll, persistSession, persistTenant } from '@/lib/data/local-repository'

let snapshot = { tenants: createSeedData(), session: null as OwnerSession, hydrated: false, recoveryMessage: undefined as string | undefined, verifiedBookingId: undefined as string | undefined }
let initialized = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach(fn => fn())
const broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window ? new BroadcastChannel('turfmate:v1') : null

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  snapshot = { ...loadRepository(), recoveryMessage: loadRepository().recoveryMessage, verifiedBookingId: undefined }; emit()
  window.addEventListener('storage', () => { const next = loadRepository(); snapshot = { ...next, recoveryMessage: next.recoveryMessage, verifiedBookingId: snapshot.verifiedBookingId }; emit() })
  broadcast?.addEventListener('message', () => { const next = loadRepository(); snapshot = { ...next, recoveryMessage: next.recoveryMessage, verifiedBookingId: snapshot.verifiedBookingId }; emit() })
  window.setInterval(emit, 30_000)
}
function commitTenant(data: TenantData) { snapshot = { ...snapshot, tenants: { ...snapshot.tenants, [data.tenant.id]: data }, hydrated: true }; persistTenant(data); broadcast?.postMessage('changed'); emit() }
export const turfActions = {
  login(tenantId: string) { const session = { tenantId, email: 'owner@turfmate.demo' }; snapshot = { ...snapshot, session }; persistSession(session); emit() },
  verifyBooking(id?: string) { snapshot = { ...snapshot, verifiedBookingId: id }; emit() },
  logout() { snapshot = { ...snapshot, session: null }; persistSession(null); emit() },
  update(tenantId: string, updater: (data: TenantData) => TenantData) { const data = snapshot.tenants[tenantId]; if (data) commitTenant(updater(structuredClone(data))) },
  saveDraft(tenantId: string, draft?: BookingDraft) { this.update(tenantId, d => ({ ...d, draft })) },
  addHold(tenantId: string, hold: Hold) { this.update(tenantId, d => ({ ...d, holds: [...d.holds.filter(h => h.id !== hold.id), hold] })) },
  removeHold(tenantId: string, id: string) { this.update(tenantId, d => ({ ...d, holds: d.holds.filter(h => h.id !== id) })) },
  addBooking(tenantId: string, booking: Booking) { this.update(tenantId, d => ({ ...d, bookings: [...d.bookings, booking], draft: undefined })) },
  updateBooking(tenantId: string, id: string, changes: Partial<Booking>) { this.update(tenantId, d => ({ ...d, bookings: d.bookings.map(b => b.id === id ? { ...b, ...changes } : b) })) },
  addBlock(tenantId: string, block: Block) { this.update(tenantId, d => ({ ...d, blocks: [...d.blocks.filter(b => b.id !== block.id), block] })) },
  deleteBlock(tenantId: string, id: string) { this.update(tenantId, d => ({ ...d, blocks: d.blocks.filter(b => b.id !== id) })) },
  resetTenant(tenantId: string) { const seed = createSeedData()[tenantId]; if (seed) commitTenant(seed) },
  resetAll() { const tenants = createSeedData(); snapshot = { ...snapshot, tenants, hydrated: true }; persistAll(tenants); broadcast?.postMessage('changed'); emit() },
}
const subscribe = (fn: () => void) => { listeners.add(fn); init(); return () => listeners.delete(fn) }
const getSnapshot = () => snapshot
const getServerSnapshot = () => snapshot
export function useTurfStore() { return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) }
export const findTenantBySlug = (slug: string, state = snapshot) => Object.values(state.tenants).find(t => t.turf.publicSlug === slug && t.tenant.status === 'active')
