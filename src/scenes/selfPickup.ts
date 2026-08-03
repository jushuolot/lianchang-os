import type { AppState, JobPhase, StationId } from '../types'
import type { GuideRole, GuideStep } from '../guideShared'
import type { SceneModule } from './types'
import { clock, img, log, seal, withPhase } from './helpers'

function seed(): AppState {
  const at = clock()
  return {
    productName: '链场 OS',
    scene: {
      id: 'scene-self-pickup',
      name: '仓配自提 · 进出场',
      brief:
        '默认「现场导引」：地图定位 + 实景图 + 本步要求 + 单一操作。提货人 / 司机 / 门岗 / 调度按角色推进；熟悉后可切完整工位。',
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
        at,
        kind: 'system',
      },
      {
        id: 'l2',
        channel: 'ops',
        from: 'customer',
        text: '提货预约已确认，预计到仓办理自提。',
        at,
        kind: 'counter',
      },
    ],
  }
}

function run(s: AppState, action: string): { state: AppState; tip: string; ok: boolean } {
  const job = (phase: JobPhase, note?: string) => withPhase(s, phase, note)

  switch (action) {
    case 'dispatch':
      return {
        ok: true,
        tip: '派车指令已下达',
        state: {
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
        },
      }
    case 'arrive_gate':
      return {
        ok: true,
        tip: '司机已到闸报到',
        state: {
          ...s,
          job: job('arrived_gate'),
          logs: [
            ...s.logs,
            log('ops', 'driver', `已到${s.job.warehouse}闸口，申请入场核验。`, 'report'),
            log('gate', 'driver', `${s.job.plate} 报到，申请入场。`, 'radio'),
            log('gate', 'gate', '收到。请停靠待检区，配合口令与安全核验。', 'radio'),
          ],
        },
      }
    case 'admit': {
      if (!s.gateChecks.every((c) => c.done)) {
        return { ok: false, tip: '入场核验项未完成，不可放行', state: s }
      }
      return {
        ok: true,
        tip: '准予入场',
        state: {
          ...s,
          job: job('admitted', '门岗准予入场'),
          seals: seal(s.seals, '入场放行'),
          logs: [
            ...s.logs,
            log('gate', 'gate', `口令核验通过。准予驶入${s.job.dock}。`, 'radio'),
            log('ops', 'gate', '入场放行已办结，司机进入场内作业。', 'report'),
          ],
        },
      }
    }
    case 'ready': {
      if (s.job.phase !== 'admitted' && s.job.phase !== 'ready_for_pickup') {
        return { ok: false, tip: '尚未入场，不能申报备货完成', state: s }
      }
      return {
        ok: true,
        tip: '备货完成，待提货签收',
        state: {
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
        },
      }
    }
    case 'counter_checkin':
      return {
        ok: true,
        tip: '提货人已报到',
        state: {
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
        },
      }
    case 'sign': {
      if (!['ready_for_pickup', 'admitted', 'signed'].includes(s.job.phase)) {
        return { ok: false, tip: '备货未完成，不可签收', state: s }
      }
      return {
        ok: true,
        tip: '签收完成，待离场',
        state: {
          ...s,
          job: job('signed', '提货人签收确认'),
          seals: seal(s.seals, '签收确认'),
          logs: [
            ...s.logs,
            log('counter', 'customer', '点件无误，签收确认。申请离场。', 'counter'),
            log('gate', 'dispatcher', '提货已签收，请办理离场核验。', 'radio'),
          ],
        },
      }
    }
    case 'depart': {
      if (s.job.phase !== 'signed') {
        return { ok: false, tip: '未签收，不可离场', state: s }
      }
      return {
        ok: true,
        tip: '离场办结，本票关闭',
        state: {
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
        },
      }
    }
    default:
      return { ok: false, tip: '未知操作', state: s }
  }
}

function hasSeal(s: AppState, name: string) {
  return s.seals.includes(name)
}

function resolveGuide(state: AppState, role: GuideRole): GuideStep {
  const { job } = state
  const { phase, dock, passCode: code } = job

  if (role === 'customer') {
    if (phase === 'closed' || phase === 'departed') {
      return {
        id: 'c-done',
        role,
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
        role,
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
          role,
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
          role,
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
        role,
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
      role,
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

  if (role === 'driver') {
    if (phase === 'closed' || phase === 'departed') {
      return {
        id: 'd-done',
        role,
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
        role,
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
        role,
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
        role,
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
        role,
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
        role,
        title: '赴仓途中 · 到闸报到',
        where: '沿路线前往园区闸口',
        mapPoint: 'road',
        nextPoint: 'gate',
        image: img('driver.jpg'),
        imageCaption: '赴仓在途视线',
        requirements: [`目标：${job.warehouse} 闸口`, `入场后前往 ${dock}`, `口令：${code}`],
        primary: { action: 'arrive_gate', label: '到闸报到' },
      }
    }
    return {
      id: 'd-wait',
      role,
      title: '待命 · 等待派车',
      where: '等待调度下达指令',
      mapPoint: 'road',
      image: img('dock.jpg'),
      imageCaption: '待命',
      requirements: ['收到派车指令后再出发'],
      waiting: '等待调度：派车指令',
    }
  }

  if (role === 'gate') {
    const checksDone = state.gateChecks.every((c) => c.done)
    if (phase === 'closed' || phase === 'departed') {
      return {
        id: 'g-done',
        role,
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
        role,
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
        role,
        title: '入场核验',
        where: '闸口入场核验位',
        mapPoint: 'gate',
        nextPoint: 'dock',
        image: img('plate.jpg'),
        imageCaption: '待检车辆 / 车牌',
        requirements: [
          `核对通行口令：${code}`,
          checksDone ? '核验项已齐，可放行' : '核验项未齐，请先完成勾选',
          '建议拍摄车牌核验照',
        ],
        primary: { action: 'admit', label: '核验通过 · 准予入场' },
        photoKind: 'plate',
        photoLabel: '车牌核验照',
      }
    }
    if (phase === 'admitted' || phase === 'ready_for_pickup') {
      return {
        id: 'g-watch',
        role,
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
      role,
      title: '等待车辆到闸',
      where: '闸口',
      mapPoint: 'gate',
      image: img('gate.jpg'),
      imageCaption: '闸口通道',
      requirements: ['司机到闸报到后开始核验'],
      waiting: '等待司机：到闸报到',
    }
  }

  // dispatcher
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
        `运力：${job.driverName} / ${job.plate}`,
        `作业点：${job.warehouse} ${dock}`,
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
    requirements: ['当前状态见顶部进度', '现场由司机 / 门岗 / 提货人按导引办理'],
    waiting: '现场作业进行中',
  }
}

const stationMeta: Record<StationId, { title: string; role: string; purpose: string }> = {
  dispatch: {
    title: '调度台',
    role: '调度岗',
    purpose: '下达派车与节点指令，跟踪本票进度',
  },
  driver: {
    title: '司机端',
    role: '司机岗 · 手机终端',
    purpose: '接收指令、到闸报到、场内备货回报、现场拍照取证',
  },
  gate: {
    title: '门岗台',
    role: '门岗岗 · 终端',
    purpose: '核验口令与安全项，办理入场 / 离场，车牌与核验拍照',
  },
  counter: {
    title: '提货窗口',
    role: '提货人 / 仓配 · 终端',
    purpose: '提货报到、点件签收、签收现场拍照',
  },
}

export const selfPickupScene: SceneModule = {
  id: 'scene-self-pickup',
  name: '仓配自提 · 进出场',
  status: 'active',
  brief:
    '默认「现场导引」：地图 + 实景 + 本步要求。提货人 / 司机 / 门岗 / 调度按角色推进。',
  seed,
  run,
  guideRoles: [
    { id: 'customer', label: '提货人', station: 'counter' },
    { id: 'driver', label: '司机', station: 'driver' },
    { id: 'gate', label: '门岗', station: 'gate' },
    { id: 'dispatcher', label: '调度', station: 'dispatch' },
  ],
  defaultGuideRole: 'customer',
  resolveGuide,
  progress: [
    { id: 'p1', label: '派车', phases: ['dispatched', 'arrived_gate', 'admitted', 'ready_for_pickup', 'signed', 'departed', 'closed'] },
    { id: 'p2', label: '到闸', phases: ['arrived_gate', 'admitted', 'ready_for_pickup', 'signed', 'departed', 'closed'] },
    { id: 'p3', label: '入场', phases: ['admitted', 'ready_for_pickup', 'signed', 'departed', 'closed'] },
    { id: 'p4', label: '备货', phases: ['ready_for_pickup', 'signed', 'departed', 'closed'] },
    { id: 'p5', label: '签收', phases: ['signed', 'departed', 'closed'] },
    { id: 'p6', label: '离场', phases: ['departed', 'closed'] },
  ],
  stationMeta,
  phaseLabel: {},
  mapLayout: 'yard',
}
