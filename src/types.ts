/** 链场 OS — 物流供应链现场操作系统 */

export type StationId = 'dispatch' | 'driver' | 'gate' | 'counter'

export type ActorId = 'dispatcher' | 'driver' | 'gate' | 'customer' | 'warehouse' | 'system'

export type JobPhase =
  | 'draft'
  | 'dispatched'
  | 'arrived_gate'
  | 'admitted'
  | 'ready_for_pickup'
  | 'signed'
  | 'departed'
  | 'closed'

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

export interface AppState {
  productName: string
  scene: SceneDefinition
  activeStation: StationId
  job: JobTicket
  logs: WorkLog[]
  gateChecks: { id: string; label: string; done: boolean }[]
  seals: string[]
}

export const ACTOR_LABEL: Record<ActorId, string> = {
  dispatcher: '调度',
  driver: '司机',
  gate: '门岗',
  customer: '提货人',
  warehouse: '仓管',
  system: '系统',
}

export const PHASE_LABEL: Record<JobPhase, string> = {
  draft: '待派车',
  dispatched: '已派车 · 在途赴仓',
  arrived_gate: '已到闸 · 待准入',
  admitted: '已放行 · 场内作业',
  ready_for_pickup: '备货完成 · 待提货人签收',
  signed: '已签收 · 待离场',
  departed: '已离场',
  closed: '本票关闭',
}

export const STATION_META: Record<
  StationId,
  { title: string; role: string; purpose: string }
> = {
  dispatch: {
    title: '调度台',
    role: '调度岗',
    purpose: '下达派车与节点指令，跟踪本票进度',
  },
  driver: {
    title: '司机端',
    role: '司机岗',
    purpose: '接收指令、到闸报到、场内备货回报',
  },
  gate: {
    title: '门岗台',
    role: '门岗岗',
    purpose: '核验口令与安全项，办理入场 / 离场',
  },
  counter: {
    title: '提货窗口',
    role: '提货人 / 仓配协同',
    purpose: '提货报到、点件签收',
  },
}
