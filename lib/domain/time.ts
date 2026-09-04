const parts = (date: Date, timeZone: string) => Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(p => [p.type, p.value]))

export function zonedDateTime(date: string, minute: number, timeZone: string) {
  const dayShift = Math.floor(minute / 1440)
  const base = new Date(`${date}T00:00:00Z`)
  base.setUTCDate(base.getUTCDate() + dayShift)
  const targetDate = base.toISOString().slice(0, 10)
  const hh = Math.floor((minute % 1440) / 60)
  const mm = minute % 60
  let guess = Date.UTC(Number(targetDate.slice(0, 4)), Number(targetDate.slice(5, 7)) - 1, Number(targetDate.slice(8, 10)), hh, mm)
  for (let i = 0; i < 2; i++) {
    const p = parts(new Date(guess), timeZone)
    const seen = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute))
    const wanted = Date.UTC(Number(targetDate.slice(0, 4)), Number(targetDate.slice(5, 7)) - 1, Number(targetDate.slice(8, 10)), hh, mm)
    guess += wanted - seen
  }
  return new Date(guess).toISOString()
}

export const addMinutes = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60000).toISOString()
export const toDateInput = (date = new Date()) => date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
export const datePlus = (date: string, days: number) => { const d = new Date(`${date}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10) }
export const localParts = (iso: string, timeZone: string) => parts(new Date(iso), timeZone)
export const localDate = (iso: string, timeZone: string) => { const p = localParts(iso, timeZone); return `${p.year}-${p.month}-${p.day}` }
export const localMinute = (iso: string, timeZone: string) => { const p = localParts(iso, timeZone); return Number(p.hour) * 60 + Number(p.minute) }
export const weekday = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay()
export const formatDate = (isoOrDate: string, timeZone = 'Asia/Kolkata') => new Intl.DateTimeFormat('en-IN', { timeZone, weekday: 'short', day: 'numeric', month: 'short' }).format(isoOrDate.length === 10 ? new Date(`${isoOrDate}T12:00:00Z`) : new Date(isoOrDate))
export const formatTime = (iso: string, timeZone = 'Asia/Kolkata') => new Intl.DateTimeFormat('en-IN', { timeZone, hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
export const formatMinutes = (minute: number) => { const h = Math.floor((minute % 1440) / 60); const m = minute % 60; return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}` }
export const crossesMidnight = (startAt: string, endAt: string, timeZone: string) => localDate(startAt, timeZone) !== localDate(addMinutes(endAt, -1), timeZone)
