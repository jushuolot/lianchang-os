import type { JobPhase, StationId } from './types'

/** 第一人称实景：按工位 + 本票节点切换视线 */
export interface PovShot {
  src: string
  stance: string
  focus: string
}

const BASE = import.meta.env.BASE_URL

function img(name: string) {
  return `${BASE}pov/${name}`
}

export function resolvePov(station: StationId, phase: JobPhase): PovShot {
  if (station === 'dispatch') {
    return {
      src: img('dispatch.jpg'),
      stance: '调度台 · 工位视线',
      focus: '本票指令屏与作业节点',
    }
  }

  if (station === 'gate') {
    if (phase === 'signed' || phase === 'departed' || phase === 'closed') {
      return {
        src: img('yard.jpg'),
        stance: '门岗 · 离场核验位',
        focus: '箱区通道与待驶离运力',
      }
    }
    if (phase === 'arrived_gate') {
      return {
        src: img('plate.jpg'),
        stance: '门岗 · 入场核验位',
        focus: '待检车辆与车牌核验',
      }
    }
    return {
      src: img('gate.jpg'),
      stance: '门岗 · 道口视线',
      focus: '园区运力与闸口通道',
    }
  }

  if (station === 'counter') {
    if (phase === 'ready_for_pickup' || phase === 'signed' || phase === 'departed') {
      return {
        src: img('cargo.jpg'),
        stance: '提货窗口 · 点件位',
        focus: '待签收货物与点件现场',
      }
    }
    return {
      src: img('counter.jpg'),
      stance: '提货窗口 · 报到位',
      focus: '仓配作业区与提货通道',
    }
  }

  // driver — 手机终端视线
  if (
    phase === 'admitted' ||
    phase === 'ready_for_pickup' ||
    phase === 'signed'
  ) {
    return {
      src: img('dock-work.jpg'),
      stance: '司机端 · 场内作业',
      focus: '月台叉车作业与备货点交',
    }
  }
  if (phase === 'arrived_gate') {
    return {
      src: img('plate.jpg'),
      stance: '司机端 · 到闸报到',
      focus: '道口待检车辆，可拍车牌取证',
    }
  }
  if (phase === 'departed' || phase === 'closed') {
    return {
      src: img('yard.jpg'),
      stance: '司机端 · 离场',
      focus: '箱区出口通道',
    }
  }
  if (phase === 'dispatched') {
    return {
      src: img('driver.jpg'),
      stance: '司机端 · 赴仓在途',
      focus: '道路前方与赴仓路线',
    }
  }
  return {
    src: img('dock.jpg'),
    stance: '司机端 · 待命',
    focus: '仓配通道，等待派车指令',
  }
}
