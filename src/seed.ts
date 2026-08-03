import type { AppState } from './types'

/** 首场戏：仓配自提进出场（可插拔，后续加戏） */
export function seedApp(): AppState {
  const at = () => {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  return {
    productName: '链场 OS',
    scene: {
      id: 'scene-self-pickup',
      name: '仓配自提 · 进出场',
      brief:
        '提货人预约自提。调度派车备货至指定道口；司机到闸报到；门岗核验后放行入场；备货完成后面签收；门岗办理离场。本场为可插拔场景模块。',
    },
    activeStation: 'dispatch',
    job: {
      id: 'job-1',
      refNo: 'ZP-SP-240803-01',
      title: '浦东仓辅料自提',
      summary: '提货人陈敏预约自提辅料。司机王强赴仓备货至道口 3，门岗按口令核验进出。',
      phase: 'draft',
      plate: '沪AD8899',
      driverName: '王强',
      warehouse: '浦东仓',
      dock: '道口 3',
      cargo: '辅料纸箱',
      customerName: '陈敏',
      passCode: 'PJ-辅料-陈敏',
      checklist: ['预约有效', '安全告知已传达'],
    },
    gateChecks: [
      { id: 'ppe', label: '安全防护已确认', done: false },
      { id: 'pass', label: '通行口令核验一致', done: false },
      { id: 'match', label: '车牌 / 提货人与预约一致', done: false },
    ],
    seals: [],
    photos: [],
    logs: [
      {
        id: 'l1',
        channel: 'ops',
        from: 'system',
        text: '场景已加载：仓配自提 · 进出场。请从调度台下达派车指令。',
        at: at(),
        kind: 'system',
      },
      {
        id: 'l2',
        channel: 'ops',
        from: 'customer',
        text: '提货预约已确认，预计到仓办理自提。',
        at: at(),
        kind: 'counter',
      },
    ],
  }
}

/** 后续加戏在此注册 */
export const SCENE_CATALOG = [
  { id: 'scene-self-pickup', name: '仓配自提 · 进出场', status: 'active' as const },
  { id: 'scene-linehaul', name: '干线提送 · 双端准入', status: 'planned' as const },
  { id: 'scene-exception', name: '在途异常 · 现场处置', status: 'planned' as const },
]
