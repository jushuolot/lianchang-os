import type { ActorId, AppState, JobPhase, LogKind, WorkLog } from '../types'

export function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 8)}`
}

export function clock() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function seal(list: string[], s: string) {
  return list.includes(s) ? list : [...list, s]
}

export function log(
  channel: string,
  from: ActorId,
  text: string,
  kind: LogKind,
): WorkLog {
  return { id: uid('l'), channel, from, text, at: clock(), kind }
}

export function withPhase(state: AppState, phase: JobPhase, note?: string) {
  return {
    ...state.job,
    phase,
    checklist: note ? [...state.job.checklist, note] : state.job.checklist,
  }
}

export function img(name: string) {
  return `${import.meta.env.BASE_URL}pov/${name}`
}
