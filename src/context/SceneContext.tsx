import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { seedApp } from '../seed'
import type { FieldShot, FieldShotKind } from '../fieldPhoto'
import type { ActorId, AppState, JobPhase, LogKind, StationId, WorkLog } from '../types'

const KEY = 'lianchang-os-v2'

interface Api extends AppState {
  setStation: (s: StationId) => void
  run: (action: string) => { ok: boolean; tip: string }
  toggleGateCheck: (id: string) => void
  addPhoto: (input: {
    station: FieldShot['station']
    kind: FieldShotKind
    label: string
    dataUrl: string
  }) => { ok: boolean; tip: string }
  removePhoto: (id: string) => void
  reset: () => void
  channel: (id: string) => WorkLog[]
}

const Ctx = createContext<Api | null>(null)

function uid(p: string) {
  return `${p}-${Math.random().toString(36).slice(2, 8)}`
}

function clock() {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function load(): AppState {
  const base = seedApp()
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem('lianchang-os-v1')
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState>
      return {
        ...base,
        ...parsed,
        productName: '链场 OS',
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
        gateChecks: parsed.gateChecks ?? base.gateChecks,
        logs: parsed.logs ?? base.logs,
        job: { ...base.job, ...parsed.job },
      }
    }
  } catch {
    /* ignore */
  }
  return base
}

function seal(list: string[], s: string) {
  return list.includes(s) ? list : [...list, s]
}

function log(
  channel: string,
  from: ActorId,
  text: string,
  kind: LogKind,
): WorkLog {
  return { id: uid('l'), channel, from, text, at: clock(), kind }
}

const PHOTO_ACTOR: Record<FieldShot['station'], ActorId> = {
  driver: 'driver',
  gate: 'gate',
  counter: 'customer',
}

const PHOTO_CHANNEL: Record<FieldShot['station'], string> = {
  driver: 'ops',
  gate: 'gate',
  counter: 'counter',
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* quota — drop oldest photos and retry once */
      try {
        const slim = {
          ...state,
          photos: state.photos.slice(-4),
        }
        localStorage.setItem(KEY, JSON.stringify(slim))
      } catch {
        /* ignore */
      }
    }
  }, [state])

  const setStation = useCallback((activeStation: StationId) => {
    setState((s) => ({ ...s, activeStation }))
  }, [])

  const toggleGateCheck = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      gateChecks: s.gateChecks.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    }))
  }, [])

  const addPhoto = useCallback(
    (input: {
      station: FieldShot['station']
      kind: FieldShotKind
      label: string
      dataUrl: string
    }) => {
      let result = { ok: true, tip: '现场照片已归档' }
      setState((s) => {
        if (s.photos.length >= 12) {
          result = { ok: false, tip: '本票取证已满，请删除旧照后再拍' }
          return s
        }
        const shot: FieldShot = {
          id: uid('p'),
          station: input.station,
          kind: input.kind,
          label: input.label,
          dataUrl: input.dataUrl,
          at: clock(),
        }
        const from = PHOTO_ACTOR[input.station]
        const channel = PHOTO_CHANNEL[input.station]
        return {
          ...s,
          photos: [...s.photos, shot],
          seals: seal(s.seals, '现场取证'),
          logs: [
            ...s.logs,
            log(
              channel,
              from,
              `现场取证：${input.label}（手机拍照已归档）。`,
              input.station === 'gate' ? 'radio' : input.station === 'counter' ? 'counter' : 'report',
            ),
          ],
        }
      })
      return result
    },
    [],
  )

  const removePhoto = useCallback((id: string) => {
    setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }))
  }, [])

  const run = useCallback((action: string) => {
    let result = { ok: true, tip: '' }
    setState((s) => {
      const job = (phase: JobPhase, note?: string) => ({
        ...s.job,
        phase,
        checklist: note ? [...s.job.checklist, note] : s.job.checklist,
      })

      switch (action) {
        case 'dispatch': {
          result = { ok: true, tip: '派车指令已下达' }
          return {
            ...s,
            job: job('dispatched', '派车指令已下达'),
            seals: seal(s.seals, '已派车'),
            logs: [
              ...s.logs,
              log(
                'ops',
                'dispatcher',
                `派车：${s.job.driverName} / ${s.job.plate} → ${s.job.warehouse}${s.job.dock}，任务：备货待自提。`,
                'instruction',
              ),
              log('ops', 'driver', '指令已接收，赴仓途中。', 'report'),
            ],
          }
        }
        case 'arrive_gate': {
          result = { ok: true, tip: '司机已到闸报到' }
          return {
            ...s,
            job: job('arrived_gate'),
            logs: [
              ...s.logs,
              log('ops', 'driver', `已到${s.job.warehouse}闸口，申请入场核验。`, 'report'),
              log('gate', 'driver', `${s.job.plate} 报到，申请入场。`, 'radio'),
              log('gate', 'gate', '收到。请停靠待检区，配合口令与安全核验。', 'radio'),
            ],
          }
        }
        case 'admit': {
          if (!s.gateChecks.every((c) => c.done)) {
            result = { ok: false, tip: '入场核验项未完成，不可放行' }
            return s
          }
          result = { ok: true, tip: '准予入场' }
          return {
            ...s,
            job: job('admitted', '门岗准予入场'),
            seals: seal(s.seals, '入场放行'),
            logs: [
              ...s.logs,
              log('gate', 'gate', `口令核验通过。准予驶入${s.job.dock}。`, 'radio'),
              log('ops', 'gate', '入场放行已办结，司机进入场内作业。', 'report'),
            ],
          }
        }
        case 'ready': {
          if (s.job.phase !== 'admitted' && s.job.phase !== 'ready_for_pickup') {
            result = { ok: false, tip: '尚未入场，不能申报备货完成' }
            return s
          }
          result = { ok: true, tip: '备货完成，待提货签收' }
          return {
            ...s,
            job: job('ready_for_pickup', '仓管确认备货完成'),
            logs: [
              ...s.logs,
              log('ops', 'driver', `货已备至${s.job.dock}，与仓管完成点交，等待提货人。`, 'report'),
              log(
                'counter',
                'dispatcher',
                `提货窗口：货已到位。提货人凭口令「${s.job.passCode}」办理。`,
                'counter',
              ),
            ],
          }
        }
        case 'counter_checkin': {
          result = { ok: true, tip: '提货人已报到' }
          return {
            ...s,
            seals: seal(s.seals, '提货报到'),
            logs: [
              ...s.logs,
              log(
                'counter',
                'customer',
                `提货人${s.job.customerName}报到，口令：${s.job.passCode}。`,
                'counter',
              ),
              log('counter', 'dispatcher', '报到受理。请至指定道口点件后签收。', 'counter'),
            ],
          }
        }
        case 'sign': {
          if (!['ready_for_pickup', 'admitted', 'signed'].includes(s.job.phase)) {
            result = { ok: false, tip: '备货未完成，不可签收' }
            return s
          }
          result = { ok: true, tip: '签收完成，待离场' }
          return {
            ...s,
            job: job('signed', '提货人签收确认'),
            seals: seal(s.seals, '签收确认'),
            logs: [
              ...s.logs,
              log('counter', 'customer', '点件无误，签收确认。申请离场。', 'counter'),
              log('gate', 'dispatcher', '提货已签收，请办理离场核验。', 'radio'),
            ],
          }
        }
        case 'depart': {
          if (s.job.phase !== 'signed') {
            result = { ok: false, tip: '未签收，不可离场' }
            return s
          }
          result = { ok: true, tip: '离场办结，本票关闭' }
          return {
            ...s,
            job: job('closed', '门岗离场办结'),
            seals: seal(seal(s.seals, '离场确认'), '本票关闭'),
            logs: [
              ...s.logs,
              log('gate', 'gate', '离场核验通过，准予驶离。', 'radio'),
              log(
                'ops',
                'system',
                '本票闭环：派车 → 到闸 → 入场 → 备货 → 签收 → 离场。场景执行完毕。',
                'system',
              ),
            ],
          }
        }
        default:
          result = { ok: false, tip: '未知操作' }
          return s
      }
    })
    return result
  }, [])

  const channel = useCallback(
    (id: string) => state.logs.filter((l) => l.channel === id || (id === 'ops' && l.channel === 'ops')),
    [state.logs],
  )

  const reset = useCallback(() => {
    localStorage.removeItem(KEY)
    localStorage.removeItem('lianchang-os-v1')
    setState(seedApp())
  }, [])

  const value = useMemo<Api>(
    () => ({
      ...state,
      setStation,
      run,
      toggleGateCheck,
      addPhoto,
      removePhoto,
      reset,
      channel,
    }),
    [state, setStation, run, toggleGateCheck, addPhoto, removePhoto, reset, channel],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp within SceneProvider')
  return ctx
}
