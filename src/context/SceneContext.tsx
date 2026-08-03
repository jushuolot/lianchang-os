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
import type { ActorId, AppState, JobPhase, LogKind, StationId, WorkLog } from '../types'

const KEY = 'lianchang-os-v1'

interface Api extends AppState {
  setStation: (s: StationId) => void
  run: (action: string) => { ok: boolean; tip: string }
  toggleGateCheck: (id: string) => void
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
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...seedApp(), ...JSON.parse(raw), productName: '链场 OS' }
  } catch {
    /* ignore */
  }
  return seedApp()
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

export function SceneProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      /* ignore */
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
    setState(seedApp())
  }, [])

  const value = useMemo<Api>(
    () => ({
      ...state,
      setStation,
      run,
      toggleGateCheck,
      reset,
      channel,
    }),
    [state, setStation, run, toggleGateCheck, reset, channel],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp within SceneProvider')
  return ctx
}
