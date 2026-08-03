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
        focus: '场内待驶离运力与箱区通道',
      }
    }
    return {
      src: img('gate.jpg'),
      stance: '门岗 · 入场核验位',
      focus: '闸口外侧车辆与通行口令核验',
    }
  }

  if (station === 'counter') {
    if (phase === 'ready_for_pickup' || phase === 'signed' || phase === 'departed') {
      return {
        src: img('dock-work.jpg'),
        stance: '提货窗口 · 点件位',
        focus: '月台备货区与待签收货物',
      }
    }
    return {
      src: img('counter.jpg'),
      stance: '提货窗口 · 报到位',
      focus: '仓配作业区与提货人报到通道',
    }
  }

  // driver
  if (
    phase === 'admitted' ||
    phase === 'ready_for_pickup' ||
    phase === 'signed'
  ) {
    return {
      src: img('dock.jpg'),
      stance: '司机 · 场内作业视线',
      focus: '指定月台通道与备货区',
    }
  }
  if (phase === 'arrived_gate') {
    return {
      src: img('gate.jpg'),
      stance: '司机 · 到闸视线',
      focus: '道口闸杆与门岗核验位',
    }
  }
  if (phase === 'departed' || phase === 'closed') {
    return {
      src: img('yard.jpg'),
      stance: '司机 · 离场后视线',
      focus: '园区出口与箱区通道',
    }
  }
  return {
    src: img('driver.jpg'),
    stance: '司机 · 赴仓在途视线',
    focus: '道路前方与赴仓路线',
  }
}
