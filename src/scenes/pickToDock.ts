import type { AppState, JobPhase, StationId } from '../types'
import type { GuideRole, GuideStep, MapPoint } from '../guideShared'
import type { SceneModule } from './types'
import { clock, img, log, seal, withPhase } from './helpers'

/** 仓库拣货出库到月台 */
function seed(): AppState {
  const at = clock()
  return {
    productName: '链场 OS',
    scene: {
      id: 'scene-pick-dock',
      name: '仓内拣货 · 出库到月台',
      brief:
        '出库波次下发后：拣货员按库位拣货 → 复核台复核 → 送达指定月台交接。现场导引默认拣货员视角。',
    },
    activeStation: 'dispatch',
    job: {
      id: 'job-pick-1',
      refNo: 'CK-OB-240803-18',
      title: '电商出库波次 W-18',
      summary: '拣货员李拣按库位拣选 36 件，复核后送达月台 B2，与月台仓管完成交接。',
      phase: 'draft',
      plate: '波次 W-18',
      driverName: '李拣',
      warehouse: '浦东仓',
      dock: '月台 B2',
      cargo: '纸箱 36 件 / 12 SKU',
      customerName: '周核',
      passCode: 'A03-B12 → B07-C04',
      checklist: ['波次已生成', '库位库存已锁定'],
    },
    gateChecks: [
      { id: 'qty', label: '件数与波次一致', done: false },
      { id: 'sku', label: 'SKU / 批次抽检通过', done: false },
      { id: 'pack', label: '外包装完好可出库', done: false },
    ],
    seals: [],
    photos: [],
    logs: [
      {
        id: 'lp1',
        channel: 'ops',
        from: 'system',
        text: '场景已加载：仓内拣货 · 出库到月台。请调度下发波次。',
        at,
        kind: 'system',
      },
    ],
  }
}

function run(s: AppState, action: string): { state: AppState; tip: string; ok: boolean } {
  const job = (phase: JobPhase, note?: string) => withPhase(s, phase, note)

  switch (action) {
    case 'release_wave':
      return {
        ok: true,
        tip: '出库波次已下发',
        state: {
          ...s,
          job: job('wave_released', '波次已下发至拣货端'),
          seals: seal(s.seals, '波次下发'),
          logs: [
            ...s.logs,
            log(
              'ops',
              'dispatcher',
              `下发波次 ${s.job.plate}：${s.job.cargo} → 目标 ${s.job.dock}。拣货员：${s.job.driverName}。`,
              'instruction',
            ),
            log('ops', 'warehouse', '波次已接收，前往库位开始拣货。', 'report'),
          ],
        },
      }
    case 'start_pick': {
      if (s.job.phase !== 'wave_released' && s.job.phase !== 'picking') {
        return { ok: false, tip: '波次未下发，不能开始拣货', state: s }
      }
      return {
        ok: true,
        tip: '已开始拣货',
        state: {
          ...s,
          job: job('picking', '拣货作业中'),
          seals: seal(s.seals, '拣货中'),
          logs: [
            ...s.logs,
            log(
              'ops',
              'warehouse',
              `开始拣货。路径：${s.job.passCode}。目标月台：${s.job.dock}。`,
              'report',
            ),
          ],
        },
      }
    }
    case 'finish_pick': {
      if (s.job.phase !== 'picking' && s.job.phase !== 'picked') {
        return { ok: false, tip: '请先开始拣货', state: s }
      }
      return {
        ok: true,
        tip: '拣货完成，送复核',
        state: {
          ...s,
          job: job('picked', '拣货完成，待复核'),
          seals: seal(s.seals, '拣货完成'),
          logs: [
            ...s.logs,
            log('ops', 'warehouse', `拣货完成：${s.job.cargo}。请至复核台。`, 'report'),
            log('gate', 'warehouse', '拣货单已送达复核台，申请复核。', 'radio'),
          ],
        },
      }
    }
    case 'check_pass': {
      if (s.job.phase !== 'picked') {
        return { ok: false, tip: '拣货未完成，不可复核', state: s }
      }
      if (!s.gateChecks.every((c) => c.done)) {
        return { ok: false, tip: '复核项未完成，不可通过', state: s }
      }
      return {
        ok: true,
        tip: '复核通过，可送月台',
        state: {
          ...s,
          job: job('checked', '复核通过，待送月台'),
          seals: seal(s.seals, '复核通过'),
          logs: [
            ...s.logs,
            log(
              'gate',
              'gate',
              `复核员${s.job.customerName}：件数 / SKU / 包装核验通过。`,
              'radio',
            ),
            log('ops', 'gate', `准予送往 ${s.job.dock}。`, 'report'),
          ],
        },
      }
    }
    case 'stage_dock': {
      if (s.job.phase !== 'checked' && s.job.phase !== 'staged') {
        return { ok: false, tip: '复核未通过，不可送月台', state: s }
      }
      return {
        ok: true,
        tip: '已送达月台，待交接',
        state: {
          ...s,
          job: job('staged', '已送达月台，待交接'),
          seals: seal(s.seals, '送达月台'),
          logs: [
            ...s.logs,
            log(
              'ops',
              'warehouse',
              `货已送达 ${s.job.dock}，等待月台仓管交接确认。`,
              'report',
            ),
            log(
              'counter',
              'warehouse',
              `月台交接：波次 ${s.job.plate}，${s.job.cargo}。`,
              'counter',
            ),
          ],
        },
      }
    }
    case 'dock_confirm': {
      if (s.job.phase !== 'staged') {
        return { ok: false, tip: '货物未送达月台，不可交接', state: s }
      }
      return {
        ok: true,
        tip: '月台交接完成，本票关闭',
        state: {
          ...s,
          job: job('closed', '月台交接确认'),
          seals: seal(seal(s.seals, '月台交接'), '本票关闭'),
          logs: [
            ...s.logs,
            log('counter', 'customer', '月台点交无误，交接确认。', 'counter'),
            log(
              'ops',
              'system',
              '本票闭环：下发 → 拣货 → 复核 → 送月台 → 交接。场景执行完毕。',
              'system',
            ),
          ],
        },
      }
    }
    default:
      return { ok: false, tip: '未知操作', state: s }
  }
}

function resolveGuide(state: AppState, role: GuideRole): GuideStep {
  const { job } = state
  const { phase, dock, passCode, plate, cargo, driverName, customerName } = job

  if (role === 'picker') {
    if (phase === 'closed') {
      return {
        id: 'pk-done',
        role,
        title: '本波次已办结',
        where: '可返回拣货待命区',
        mapPoint: 'aisle',
        image: img('dock.jpg'),
        imageCaption: '库区通道',
        requirements: ['交接已完成'],
        done: true,
      }
    }
    if (phase === 'staged') {
      return {
        id: 'pk-wait-dock',
        role,
        title: '货已在月台 · 等待交接',
        where: `停靠 ${dock}`,
        mapPoint: 'dock',
        image: img('cargo.jpg'),
        imageCaption: '月台待交接货物',
        requirements: ['协助月台仓管点交', '交接完成后本波次关闭'],
        waiting: '等待月台：交接确认',
      }
    }
    if (phase === 'checked') {
      return {
        id: 'pk-stage',
        role,
        title: '复核已通过 · 送往月台',
        where: `从复核台送至 ${dock}`,
        mapPoint: 'check',
        nextPoint: 'dock',
        image: img('dock-work.jpg'),
        imageCaption: '送往月台通道',
        requirements: [
          `目标月台：${dock}`,
          '整托/整箱稳固，避免混波次',
          '建议拍摄送达月台照',
          '送达后申报「已送达月台」',
        ],
        primary: { action: 'stage_dock', label: '确认已送达月台' },
        photoKind: 'dock_stage',
        photoLabel: '送达月台照',
      }
    }
    if (phase === 'picked') {
      return {
        id: 'pk-wait-check',
        role,
        title: '拣货完成 · 送复核',
        where: '前往复核台',
        mapPoint: 'aisle',
        nextPoint: 'check',
        image: img('counter.jpg'),
        imageCaption: '复核台通道',
        requirements: ['将拣货容器送至复核台', '等待复核结果'],
        waiting: '等待复核：核验通过',
      }
    }
    if (phase === 'picking') {
      return {
        id: 'pk-finish',
        role,
        title: '拣货作业中',
        where: `按路径拣选：${passCode}`,
        mapPoint: 'aisle',
        nextPoint: 'check',
        image: img('dock.jpg'),
        imageCaption: '库位拣货视线',
        requirements: [
          `波次 ${plate} · ${cargo}`,
          `库位路径：${passCode}`,
          '建议拍摄拣货完成照',
          '拣完后申报拣货完成',
        ],
        primary: { action: 'finish_pick', label: '申报拣货完成' },
        photoKind: 'pick_confirm',
        photoLabel: '拣货完成照',
      }
    }
    if (phase === 'wave_released') {
      return {
        id: 'pk-start',
        role,
        title: '波次已下发 · 开始拣货',
        where: '前往首个库位',
        mapPoint: 'dispatch',
        nextPoint: 'aisle',
        image: img('dock.jpg'),
        imageCaption: '进入库区',
        requirements: [
          `拣货员：${driverName}`,
          `路径：${passCode}`,
          `最终目标：${dock}`,
          '确认设备与容器就绪后开始',
        ],
        primary: { action: 'start_pick', label: '开始拣货' },
      }
    }
    return {
      id: 'pk-wait',
      role,
      title: '待命 · 等待波次',
      where: '拣货待命区',
      mapPoint: 'aisle',
      image: img('dock.jpg'),
      imageCaption: '库区待命',
      requirements: ['等待调度下发出库波次'],
      waiting: '等待调度：下发波次',
    }
  }

  if (role === 'checker') {
    if (phase === 'closed' || phase === 'staged' || phase === 'checked') {
      if (phase === 'closed') {
        return {
          id: 'ck-done',
          role,
          title: '本波次已关闭',
          where: '复核台',
          mapPoint: 'check',
          image: img('counter.jpg'),
          imageCaption: '复核台',
          requirements: ['无需继续操作'],
          done: true,
        }
      }
      return {
        id: 'ck-done-pass',
        role,
        title: phase === 'checked' ? '复核已通过' : '货已送月台',
        where: '复核台',
        mapPoint: 'check',
        nextPoint: 'dock',
        image: img('counter.jpg'),
        imageCaption: '复核台',
        requirements: ['本步已完成，由拣货 / 月台继续'],
        waiting: phase === 'checked' ? '等待拣货：送达月台' : '等待月台：交接',
      }
    }
    if (phase === 'picked') {
      const ok = state.gateChecks.every((c) => c.done)
      return {
        id: 'ck-pass',
        role,
        title: '出库复核',
        where: '复核台作业位',
        mapPoint: 'check',
        nextPoint: 'dock',
        image: img('cargo.jpg'),
        imageCaption: '待复核货物',
        requirements: [
          `复核员：${customerName}`,
          `波次 ${plate} · ${cargo}`,
          ok ? '复核项已齐，可通过' : '请先完成复核项勾选',
          '建议拍摄复核归档照',
        ],
        primary: { action: 'check_pass', label: '复核通过' },
        photoKind: 'check_confirm',
        photoLabel: '复核归档照',
      }
    }
    return {
      id: 'ck-idle',
      role,
      title: '等待拣货送达',
      where: '复核台',
      mapPoint: 'check',
      image: img('counter.jpg'),
      imageCaption: '复核台待命',
      requirements: ['拣货完成后开始复核'],
      waiting: '等待拣货：申报完成',
    }
  }

  if (role === 'dock') {
    if (phase === 'closed') {
      return {
        id: 'dk-done',
        role,
        title: '交接完成',
        where: dock,
        mapPoint: 'dock',
        image: img('cargo.jpg'),
        imageCaption: '月台',
        requirements: ['本波次关闭'],
        done: true,
      }
    }
    if (phase === 'staged') {
      return {
        id: 'dk-confirm',
        role,
        title: '月台交接确认',
        where: `在 ${dock} 点交`,
        mapPoint: 'dock',
        image: img('cargo.jpg'),
        imageCaption: `${dock} · 待交接`,
        requirements: [
          `核对波次 ${plate}`,
          `核对 ${cargo}`,
          '建议拍摄交接照',
          '确认后关闭本票',
        ],
        primary: { action: 'dock_confirm', label: '确认交接 · 关闭本票' },
        photoKind: 'dock_stage',
        photoLabel: '月台交接照',
      }
    }
    return {
      id: 'dk-wait',
      role,
      title: '等待货物送达月台',
      where: dock,
      mapPoint: 'dock',
      image: img('dock-work.jpg'),
      imageCaption: '月台作业区',
      requirements: ['复核通过后，拣货员将货送至本月台'],
      waiting: '等待拣货：送达月台',
    }
  }

  // dispatcher
  if (phase === 'closed') {
    return {
      id: 'ds-done',
      role: 'dispatcher',
      title: '波次已关闭',
      where: '调度台',
      mapPoint: 'dispatch',
      image: img('dispatch.jpg'),
      imageCaption: '调度台',
      requirements: ['出库闭环完成'],
      done: true,
    }
  }
  if (phase === 'draft') {
    return {
      id: 'ds-release',
      role: 'dispatcher',
      title: '下发出库波次',
      where: '调度台',
      mapPoint: 'dispatch',
      nextPoint: 'aisle',
      image: img('dispatch.jpg'),
      imageCaption: '波次指令屏',
      requirements: [
        `波次：${plate}`,
        `拣货员：${driverName}`,
        `目标月台：${dock}`,
        `库位路径：${passCode}`,
      ],
      primary: { action: 'release_wave', label: '下发波次' },
    }
  }
  return {
    id: 'ds-track',
    role: 'dispatcher',
    title: '跟踪出库节点',
    where: '调度台',
    mapPoint: 'dispatch',
    image: img('dispatch.jpg'),
    imageCaption: '节点跟踪',
    requirements: ['拣货 → 复核 → 月台交接由现场导引推进'],
    waiting: '仓内作业进行中',
  }
}

const stationMeta: Record<StationId, { title: string; role: string; purpose: string }> = {
  dispatch: {
    title: '调度台',
    role: '调度岗',
    purpose: '下发出库波次，跟踪拣货 / 复核 / 月台节点',
  },
  driver: {
    title: '拣货端',
    role: '拣货员 · 手持终端',
    purpose: '按库位拣货、拍照取证、送复核与月台',
  },
  gate: {
    title: '复核台',
    role: '复核岗 · 终端',
    purpose: '件数 / SKU / 包装复核，准予送月台',
  },
  counter: {
    title: '月台交接',
    role: '月台仓管 · 终端',
    purpose: '接收出库货、点交确认',
  },
}

export const pickDockScene: SceneModule = {
  id: 'scene-pick-dock',
  name: '仓内拣货 · 出库到月台',
  status: 'active',
  brief: '波次下发 → 拣货 → 复核 → 送月台 → 交接。导引默认拣货员。',
  seed,
  run,
  guideRoles: [
    { id: 'picker', label: '拣货员', station: 'driver' },
    { id: 'checker', label: '复核', station: 'gate' },
    { id: 'dock', label: '月台', station: 'counter' },
    { id: 'dispatcher', label: '调度', station: 'dispatch' },
  ],
  defaultGuideRole: 'picker',
  resolveGuide,
  progress: [
    {
      id: 'p1',
      label: '下发',
      phases: ['wave_released', 'picking', 'picked', 'checked', 'staged', 'closed'],
    },
    {
      id: 'p2',
      label: '拣货',
      phases: ['picking', 'picked', 'checked', 'staged', 'closed'],
    },
    {
      id: 'p3',
      label: '复核',
      phases: ['checked', 'staged', 'closed'],
    },
    {
      id: 'p4',
      label: '送月台',
      phases: ['staged', 'closed'],
    },
    {
      id: 'p5',
      label: '交接',
      phases: ['closed'],
    },
  ],
  stationMeta,
  phaseLabel: {
    draft: '待下发波次',
    wave_released: '波次已下发 · 待拣货',
    picking: '拣货中',
    picked: '拣货完成 · 待复核',
    checked: '复核通过 · 待送月台',
    staged: '已送达月台 · 待交接',
    closed: '本票关闭',
  },
  mapLayout: 'warehouse',
  mapPoints: [
    { id: 'dispatch' as MapPoint, label: '调度', x: 48, y: 80 },
    { id: 'aisle' as MapPoint, label: '库位', x: 160, y: 180 },
    { id: 'check' as MapPoint, label: '复核', x: 280, y: 180 },
    { id: 'dock' as MapPoint, label: '月台', x: 380, y: 120 },
  ],
}
