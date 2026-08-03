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
  const pickPhases: JobPhase[] = [
    'wave_released',
    'picking',
    'picked',
    'checked',
    'staged',
  ]
  const isPick = pickPhases.includes(phase) || (phase === 'draft' && station !== 'dispatch')

  // 粗判：拣货相关相位用仓内图
  if (
    pickPhases.includes(phase) ||
    (phase === 'closed' && station !== 'dispatch')
  ) {
    if (station === 'dispatch') {
      return {
        src: img('dispatch.jpg'),
        stance: '调度台',
        focus: '出库波次与节点',
      }
    }
    if (station === 'gate') {
      return {
        src: img(phase === 'picked' || phase === 'checked' ? 'cargo.jpg' : 'counter.jpg'),
        stance: '复核台',
        focus: '出库复核作业',
      }
    }
    if (station === 'counter') {
      return {
        src: img(phase === 'staged' || phase === 'closed' ? 'cargo.jpg' : 'dock-work.jpg'),
        stance: '月台交接',
        focus: '月台点交',
      }
    }
    // driver / picker
    if (phase === 'checked' || phase === 'staged') {
      return {
        src: img('dock-work.jpg'),
        stance: '拣货端 · 送月台',
        focus: '月台通道',
      }
    }
    if (phase === 'picking' || phase === 'picked' || phase === 'wave_released') {
      return {
        src: img('dock.jpg'),
        stance: '拣货端 · 库位',
        focus: '库区拣货通道',
      }
    }
  }

  void isPick

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

  if (phase === 'admitted' || phase === 'ready_for_pickup' || phase === 'signed') {
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
    focus: '仓配通道，等待指令',
  }
}
