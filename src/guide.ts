import type { FieldShotKind } from './fieldPhoto'
import type { AppState, JobPhase, StationId } from './types'

const BASE = import.meta.env.BASE_URL

function img(name: string) {
  return `${BASE}pov/${name}`
}

/** 园区示意地图上的点位 */
export type MapPoint =
  | 'road'
  | 'gate'
  | 'yard'
  | 'dock'
  | 'counter'
  | 'exit'
  | 'dispatch'

export type GuideRole = 'customer' | 'driver' | 'gate' | 'dispatcher'

export const GUIDE_ROLE_LABEL: Record<GuideRole, string> = {
  customer: '提货人',
  driver: '司机',
  gate: '门岗',
  dispatcher: '调度',
}

export const GUIDE_ROLE_STATION: Record<GuideRole, StationId> = {
  customer: 'counter',
  driver: 'driver',
  gate: 'gate',
  dispatcher: 'dispatch',
}

export interface GuideStep {
  id: string
  role: GuideRole
  title: string
  /** 你现在 / 你要去 */
  where: string
  mapPoint: MapPoint
  /** 下一步高亮（可选） */
  nextPoint?: MapPoint
  image: string
  imageCaption: string
  /** 本步说明与要求 */
  requirements: string[]
  primary?: { action: string; label: string }
  /** 等待他人时的提示 */
  waiting?: string
  /** 建议拍照类型 */
  photoKind?: FieldShotKind
  photoLabel?: string
  done?: boolean
}

function hasSeal(s: AppState, name: string) {
  return s.seals.includes(name)
}

/** 按角色 + 本票状态解析当前导引步骤 */
export function resolveGuideStep(state: AppState, role: GuideRole): GuideStep {
  const { job } = state
  const phase = job.phase
  const dock = job.dock
  const code = job.passCode

  if (role === 'customer') return customerStep(state, phase, dock, code)
  if (role === 'driver') return driverStep(state, phase, dock, code)
  if (role === 'gate') return gateStep(state, phase, code)
  return dispatcherStep(state, phase)
}

function customerStep(
  state: AppState,
  phase: JobPhase,
  dock: string,
  code: string,
): GuideStep {
  if (phase === 'closed' || phase === 'departed') {
    return {
      id: 'c-done',
      role: 'customer',
      title: '本票已办结',
      where: '提货完成，可离开园区',
      mapPoint: 'exit',
      image: img('yard.jpg'),
      imageCaption: '园区出口通道',
      requirements: ['货物已签收', '如需离场证明，可向门岗确认'],
      done: true,
    }
  }

  if (phase === 'signed') {
    return {
      id: 'c-wait-depart',
      role: 'customer',
      title: '签收完成 · 等待离场',
      where: `你在 ${dock}，等待门岗办理离场`,
      mapPoint: 'dock',
      nextPoint: 'exit',
      image: img('cargo.jpg'),
      imageCaption: '点件签收现场',
      requirements: ['本步无需你操作', '司机配合门岗离场核验即可'],
      waiting: '等待门岗：离场核验',
    }
  }

  if (phase === 'ready_for_pickup' || phase === 'admitted') {
    if (!hasSeal(state, '提货报到') && phase === 'ready_for_pickup') {
      return {
        id: 'c-checkin',
        role: 'customer',
        title: '提货报到',
        where: '前往提货窗口报到',
        mapPoint: 'counter',
        nextPoint: 'dock',
        image: img('counter.jpg'),
        imageCaption: '提货窗口报到位',
        requirements: [
          `出示通行口令：${code}`,
          '核对预约人姓名与本票一致',
          '报到后按指引前往指定道口点件',
        ],
        primary: { action: 'counter_checkin', label: '确认报到' },
      }
    }

    if (phase === 'ready_for_pickup') {
      return {
        id: 'c-sign',
        role: 'customer',
        title: '到道口点件签收',
        where: `前往 ${dock} 点件`,
        mapPoint: 'dock',
        image: img('cargo.jpg'),
        imageCaption: `${dock} · 待签收货物`,
        requirements: [
          '与仓管当面点件，核对件数与外包装',
          '建议拍摄「点件签收照」归档',
          '确认无误后提交签收',
        ],
        primary: { action: 'sign', label: '点件无误 · 确认签收' },
        photoKind: 'sign_cargo',
        photoLabel: '点件签收照',
      }
    }

    return {
      id: 'c-wait-ready',
      role: 'customer',
      title: '备货进行中',
      where: '请在提货窗口附近等候',
      mapPoint: 'counter',
      nextPoint: 'dock',
      image: img('dock-work.jpg'),
      imageCaption: '月台备货作业中',
      requirements: [`货物将备至 ${dock}`, `通行口令：${code}`, '备货完成后系统会提示报到'],
      waiting: '等待仓配：备货完成',
    }
  }

  return {
    id: 'c-wait-dispatch',
    role: 'customer',
    title: '预约已确认 · 等待备货',
    where: '尚未到仓办理，可先查看路线',
    mapPoint: 'road',
    nextPoint: 'gate',
    image: img('driver.jpg'),
    imageCaption: '赴仓路线示意',
    requirements: [
      `到仓后走闸口入场，目标 ${dock}`,
      `通行口令：${code}`,
      '首次提货：按本页逐步操作即可',
    ],
    waiting: phase === 'draft' ? '等待调度：下达派车' : '等待司机到闸 / 入场备货',
  }
}

function driverStep(
  state: AppState,
  phase: JobPhase,
  dock: string,
  code: string,
): GuideStep {
  if (phase === 'closed' || phase === 'departed') {
    return {
      id: 'd-done',
      role: 'driver',
      title: '已离场 · 本票关闭',
      where: '驶离园区',
      mapPoint: 'exit',
      image: img('yard.jpg'),
      imageCaption: '箱区出口',
      requirements: ['本票作业结束'],
      done: true,
    }
  }
  if (phase === 'signed') {
    return {
      id: 'd-depart-wait',
      role: 'driver',
      title: '前往闸口办理离场',
      where: '从场内驶向闸口',
      mapPoint: 'yard',
      nextPoint: 'exit',
      image: img('yard.jpg'),
      imageCaption: '离场通道',
      requirements: ['停靠离场待检区', '配合门岗离场核验'],
      waiting: '等待门岗：离场放行',
    }
  }
  if (phase === 'ready_for_pickup') {
    return {
      id: 'd-wait-sign',
      role: 'driver',
      title: '备货完成 · 等待提货签收',
      where: `停靠 ${dock}`,
      mapPoint: 'dock',
      image: img('dock-work.jpg'),
      imageCaption: '月台待命',
      requirements: ['保持车辆与货物安全', '提货人点件签收后，再驶向闸口'],
      waiting: '等待提货人：点件签收',
    }
  }
  if (phase === 'admitted') {
    return {
      id: 'd-ready',
      role: 'driver',
      title: '场内备货 · 完成后申报',
      where: `驶入 ${dock} 作业`,
      mapPoint: 'dock',
      image: img('dock-work.jpg'),
      imageCaption: '月台作业视线',
      requirements: [
        `按调度指令停靠 ${dock}`,
        '与仓管完成点交',
        '建议拍摄「月台备货照」',
        '完成后申报备货完成',
      ],
      primary: { action: 'ready', label: '申报备货完成' },
      photoKind: 'dock_cargo',
      photoLabel: '月台备货照',
    }
  }
  if (phase === 'arrived_gate') {
    return {
      id: 'd-wait-admit',
      role: 'driver',
      title: '已到闸 · 等待准入',
      where: '停靠闸口待检区',
      mapPoint: 'gate',
      nextPoint: 'dock',
      image: img('plate.jpg'),
      imageCaption: '到闸待检',
      requirements: [`通行口令：${code}`, '配合门岗核验', '建议补拍「到闸车牌照」'],
      waiting: '等待门岗：核验放行',
      photoKind: 'plate',
      photoLabel: '到闸车牌照',
    }
  }
  if (phase === 'dispatched') {
    return {
      id: 'd-arrive',
      role: 'driver',
      title: '赴仓途中 · 到闸报到',
      where: '沿路线前往园区闸口',
      mapPoint: 'road',
      nextPoint: 'gate',
      image: img('driver.jpg'),
      imageCaption: '赴仓在途视线',
      requirements: [`目标：${state.job.warehouse} 闸口`, `入场后前往 ${dock}`, `口令：${code}`],
      primary: { action: 'arrive_gate', label: '到闸报到' },
    }
  }
  return {
    id: 'd-wait',
    role: 'driver',
    title: '待命 · 等待派车',
    where: '等待调度下达指令',
    mapPoint: 'road',
    image: img('dock.jpg'),
    imageCaption: '待命',
    requirements: ['收到派车指令后再出发'],
    waiting: '等待调度：派车指令',
  }
}

function gateStep(state: AppState, phase: JobPhase, code: string): GuideStep {
  const checksDone = state.gateChecks.every((c) => c.done)
  if (phase === 'closed' || phase === 'departed') {
    return {
      id: 'g-done',
      role: 'gate',
      title: '离场已办结',
      where: '闸口',
      mapPoint: 'exit',
      image: img('yard.jpg'),
      imageCaption: '离场通道',
      requirements: ['本票关闭'],
      done: true,
    }
  }
  if (phase === 'signed') {
    return {
      id: 'g-depart',
      role: 'gate',
      title: '办理离场核验',
      where: '离场核验位',
      mapPoint: 'exit',
      image: img('yard.jpg'),
      imageCaption: '离场待检车辆',
      requirements: ['核对签收已完成', '建议拍摄离场核验照', '确认后准予驶离'],
      primary: { action: 'depart', label: '离场核验 · 准予驶离' },
      photoKind: 'depart',
      photoLabel: '离场核验照',
    }
  }
  if (phase === 'arrived_gate') {
    return {
      id: 'g-admit',
      role: 'gate',
      title: '入场核验',
      where: '闸口入场核验位',
      mapPoint: 'gate',
      nextPoint: 'dock',
      image: img('plate.jpg'),
      imageCaption: '待检车辆 / 车牌',
      requirements: [
        `核对通行口令：${code}`,
        '完成左侧核验项（完整工位可勾选，或本处确认后放行需先勾选）',
        checksDone ? '核验项已齐，可放行' : '核验项未齐，请先完成勾选',
        '建议拍摄车牌核验照',
      ],
      primary: { action: 'admit', label: '核验通过 · 准予入场' },
      photoKind: 'plate',
      photoLabel: '车牌核验照',
    }
  }
  if (
    phase === 'admitted' ||
    phase === 'ready_for_pickup'
  ) {
    return {
      id: 'g-watch',
      role: 'gate',
      title: '场内作业中',
      where: '闸口值守',
      mapPoint: 'gate',
      image: img('gate.jpg'),
      imageCaption: '道口值守视线',
      requirements: ['关注场内车辆动态', '提货签收后办理离场'],
      waiting: '等待提货签收后的离场申请',
    }
  }
  return {
    id: 'g-idle',
    role: 'gate',
    title: '等待车辆到闸',
    where: '闸口',
    mapPoint: 'gate',
    image: img('gate.jpg'),
    imageCaption: '闸口通道',
    requirements: ['司机到闸报到后开始核验'],
    waiting: '等待司机：到闸报到',
  }
}

function dispatcherStep(state: AppState, phase: JobPhase): GuideStep {
  if (phase === 'closed' || phase === 'departed') {
    return {
      id: 's-done',
      role: 'dispatcher',
      title: '本票已关闭',
      where: '调度台',
      mapPoint: 'dispatch',
      image: img('dispatch.jpg'),
      imageCaption: '调度台',
      requirements: ['场景执行完毕'],
      done: true,
    }
  }
  if (phase === 'draft') {
    return {
      id: 's-dispatch',
      role: 'dispatcher',
      title: '下达派车指令',
      where: '调度台 · 本票待派',
      mapPoint: 'dispatch',
      nextPoint: 'road',
      image: img('dispatch.jpg'),
      imageCaption: '指令屏',
      requirements: [
        `运力：${state.job.driverName} / ${state.job.plate}`,
        `作业点：${state.job.warehouse} ${state.job.dock}`,
        '确认预约有效后下达派车',
      ],
      primary: { action: 'dispatch', label: '下达派车指令' },
    }
  }
  return {
    id: 's-track',
    role: 'dispatcher',
    title: '跟踪本票节点',
    where: '调度台',
    mapPoint: 'dispatch',
    image: img('dispatch.jpg'),
    imageCaption: '节点跟踪',
    requirements: [
      `当前状态：见顶部进度`,
      '现场由司机 / 门岗 / 提货人按导引办理',
      '无需重复派车，除非重置本场',
    ],
    waiting: '现场作业进行中',
  }
}

/** 全场进度条（对所有角色可见） */
export const SCENE_PROGRESS: { id: string; label: string; phases: JobPhase[] }[] = [
  { id: 'p1', label: '派车', phases: ['dispatched', 'arrived_gate', 'admitted', 'ready_for_pickup', 'signed', 'departed', 'closed'] },
  { id: 'p2', label: '到闸', phases: ['arrived_gate', 'admitted', 'ready_for_pickup', 'signed', 'departed', 'closed'] },
  { id: 'p3', label: '入场', phases: ['admitted', 'ready_for_pickup', 'signed', 'departed', 'closed'] },
  { id: 'p4', label: '备货', phases: ['ready_for_pickup', 'signed', 'departed', 'closed'] },
  { id: 'p5', label: '签收', phases: ['signed', 'departed', 'closed'] },
  { id: 'p6', label: '离场', phases: ['departed', 'closed'] },
]

export function progressDone(phase: JobPhase, itemPhases: JobPhase[]) {
  return itemPhases.includes(phase)
}
