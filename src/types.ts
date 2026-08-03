/** 链场 OS — 物流供应链现场操作系统 */

export type StationId = 'dispatch' | 'driver' | 'gate' | 'counter'

export type ActorId =
  | 'dispatcher'
  | 'driver'
  | 'gate'
  | 'customer'
  | 'warehouse'
  | 'system'

export type JobPhase =
  // 仓配自提
  | 'draft'
  | 'dispatched'
  | 'arrived_gate'
  | 'admitted'
  | 'ready_for_pickup'
  | 'signed'
  | 'departed'
  | 'closed'
  // 仓内拣货出库
  | 'wave_released'
  | 'picking'
  | 'picked'
  | 'checked'
  | 'staged'

export type LogKind = 'instruction' | 'report' | 'radio' | 'counter' | 'system'

export interface WorkLog {
  id: string
  channel: string
  from: ActorId
  text: string
  at: string
  kind: LogKind
}

export interface JobTicket {
  id: string
  refNo: string
  title: string
  summary: string
  phase: JobPhase
  plate: string
  driverName: string
  warehouse: string
  dock: string
  cargo: string
  customerName: string
  passCode: string
  checklist: string[]
}

export interface SceneDefinition {
  id: string
  name: string
  brief: string
}

import type { FieldShot } from './fieldPhoto'

export type { FieldShot, FieldShotKind } from './fieldPhoto'

export interface AppState {
  productName: string
  scene: SceneDefinition
  activeStation: StationId
  job: JobTicket
  logs: WorkLog[]
  gateChecks: { id: string; label: string; done: boolean }[]
  seals: string[]
  photos: FieldShot[]
}

export const ACTOR_LABEL: Record<ActorId, string> = {
  dispatcher: '调度',
  driver: '司机',
  gate: '门岗 / 复核',
  customer: '提货人 / 月台',
  warehouse: '仓管 / 拣货',
  system: '系统',
}

export const PHASE_LABEL: Record<JobPhase, string> = {
  draft: '待启动',
  dispatched: '已派车 · 在途赴仓',
  arrived_gate: '已到闸 · 待准入',
  admitted: '已放行 · 场内作业',
  ready_for_pickup: '备货完成 · 待提货人签收',
  signed: '已签收 · 待离场',
  departed: '已离场',
  closed: '本票关闭',
  wave_released: '波次已下发 · 待拣货',
  picking: '拣货中',
  picked: '拣货完成 · 待复核',
  checked: '复核通过 · 待送月台',
  staged: '已送达月台 · 待交接',
}

/** 默认工位文案；具体场景可覆盖 */
export const STATION_META: Record<
  StationId,
  { title: string; role: string; purpose: string }
> = {
  dispatch: {
    title: '调度台',
    role: '调度岗',
    purpose: '下达指令，跟踪本票进度',
  },
  driver: {
    title: '现场终端 A',
    role: '执行岗',
    purpose: '接收指令与现场回报',
  },
  gate: {
    title: '现场终端 B',
    role: '核验岗',
    purpose: '核验与放行',
  },
  counter: {
    title: '现场终端 C',
    role: '交接岗',
    purpose: '报到、签收或交接',
  },
}

export function phaseLabelFor(phase: JobPhase, override?: Partial<Record<JobPhase, string>>) {
  return override?.[phase] ?? PHASE_LABEL[phase]
}
