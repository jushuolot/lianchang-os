import { useEffect, useState } from 'react'
import { useApp } from '../context/SceneContext'
import { phaseLabelFor, type StationId } from '../types'
import { WorkLogPanel } from '../components/ChatThread'
import { PovStage } from '../components/PovStage'
import { FieldCamera } from '../components/FieldCamera'
import { GuideView } from '../components/GuideView'
import { SCENE_CATALOG, getScene } from '../seed'
import { BASE_GUIDE_ROLE_STATION, type GuideRole } from '../guideShared'

const UI_KEY = 'lianchang-os-ui-v1'
const ROLE_KEY = 'lianchang-os-guide-role'

type UiMode = 'guide' | 'station'

function loadUi(): UiMode {
  try {
    const v = localStorage.getItem(UI_KEY)
    if (v === 'station' || v === 'guide') return v
  } catch {
    /* ignore */
  }
  return 'guide'
}

function TipBar({ tip }: { tip: string | null }) {
  if (!tip) return null
  return <div className="tip">{tip}</div>
}

function useRun() {
  const { run } = useApp()
  const [tip, setTip] = useState<string | null>(null)
  function go(action: string) {
    const r = run(action)
    setTip(r.tip)
    window.setTimeout(() => setTip(null), 2400)
  }
  return { tip, go }
}

function JobCard({ compact }: { compact?: boolean }) {
  const { job, seals, scene } = useApp()
  const mod = getScene(scene.id)
  return (
    <aside className={`job-card ${compact ? 'compact' : ''}`}>
      <div className="job-ref">{job.refNo}</div>
      <h3>{job.title}</h3>
      {!compact && <p className="job-summary">{job.summary}</p>}
      <dl className="job-dl">
        <div>
          <dt>状态</dt>
          <dd>{phaseLabelFor(job.phase, mod.phaseLabel)}</dd>
        </div>
        <div>
          <dt>作业点</dt>
          <dd>
            {job.warehouse} {job.dock}
          </dd>
        </div>
        <div>
          <dt>{scene.id === 'scene-pick-dock' ? '拣货员' : '运力'}</dt>
          <dd>
            {job.driverName}
            {scene.id === 'scene-pick-dock' ? ` · ${job.plate}` : ` · ${job.plate}`}
          </dd>
        </div>
        <div>
          <dt>{scene.id === 'scene-pick-dock' ? '库位路径' : '通行口令'}</dt>
          <dd className="code">{job.passCode}</dd>
        </div>
      </dl>
      {seals.length > 0 && (
        <div className="seals">
          {seals.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
      )}
    </aside>
  )
}

function OpsButtons({
  items,
}: {
  items: { action: string; label: string; primary?: boolean }[]
}) {
  const { tip, go } = useRun()
  return (
    <div className="ops">
      <TipBar tip={tip} />
      <div className="ops-row">
        {items.map((i) => (
          <button
            key={i.action}
            type="button"
            className={i.primary ? 'btn primary' : 'btn'}
            onClick={() => go(i.action)}
          >
            {i.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function StationTabs() {
  const { activeStation, setStation, scene } = useApp()
  const meta = getScene(scene.id).stationMeta
  return (
    <nav className="tabs">
      {(Object.keys(meta) as StationId[]).map((id) => (
        <button
          key={id}
          type="button"
          className={activeStation === id ? 'on' : ''}
          onClick={() => setStation(id)}
        >
          <span>{meta[id].title}</span>
          <small>{meta[id].role}</small>
        </button>
      ))}
    </nav>
  )
}

function stationOps(sceneId: string, station: StationId) {
  if (sceneId === 'scene-pick-dock') {
    if (station === 'dispatch') {
      return [{ action: 'release_wave', label: '下发出库波次', primary: true }]
    }
    if (station === 'driver') {
      return [
        { action: 'start_pick', label: '开始拣货', primary: true },
        { action: 'finish_pick', label: '申报拣货完成' },
        { action: 'stage_dock', label: '确认已送达月台' },
      ]
    }
    if (station === 'gate') {
      return [{ action: 'check_pass', label: '复核通过', primary: true }]
    }
    return [{ action: 'dock_confirm', label: '确认交接 · 关闭本票', primary: true }]
  }
  if (station === 'dispatch') {
    return [
      { action: 'dispatch', label: '下达派车指令', primary: true },
      { action: 'arrive_gate', label: '登记：司机到闸' },
    ]
  }
  if (station === 'driver') {
    return [
      { action: 'arrive_gate', label: '到闸报到', primary: true },
      { action: 'ready', label: '申报备货完成' },
    ]
  }
  if (station === 'gate') {
    return [
      { action: 'admit', label: '核验通过 · 准予入场', primary: true },
      { action: 'depart', label: '离场核验 · 准予驶离' },
    ]
  }
  return [
    { action: 'counter_checkin', label: '提货人报到', primary: true },
    { action: 'sign', label: '点件签收确认' },
  ]
}

function StationBody() {
  const { activeStation, logs, gateChecks, toggleGateCheck, job, scene } = useApp()
  const opsItems = stationOps(scene.id, activeStation)
  const checkTitle = scene.id === 'scene-pick-dock' ? '出库复核' : '入场核验'
  const showChecks =
    activeStation === 'gate' &&
    (scene.id === 'scene-self-pickup' || job.phase === 'picked')

  if (activeStation === 'dispatch') {
    const ops = logs.filter((l) => l.channel === 'ops')
    return (
      <div className="stage-grid">
        <PovStage station="dispatch" phase={job.phase}>
          <OpsButtons items={opsItems} />
        </PovStage>
        <div className="rail">
          <JobCard compact />
          <WorkLogPanel title="作业指令 / 回报" logs={ops} />
        </div>
      </div>
    )
  }

  if (activeStation === 'driver') {
    const ops = logs.filter((l) => l.channel === 'ops' || l.channel === 'gate')
    return (
      <div className="stage-grid">
        <PovStage station="driver" phase={job.phase}>
          <OpsButtons items={opsItems} />
        </PovStage>
        <div className="rail">
          <JobCard compact />
          <FieldCamera station="driver" />
          <WorkLogPanel title="任务动态" logs={ops} />
        </div>
      </div>
    )
  }

  if (activeStation === 'gate') {
    const gate = logs.filter((l) => l.channel === 'gate')
    return (
      <div className="stage-grid">
        <PovStage station="gate" phase={job.phase}>
          {showChecks && (
            <section className="hud-panel">
              <h2>{checkTitle}</h2>
              <ul className="checks hud-checks">
                {gateChecks.map((c) => (
                  <li key={c.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={c.done}
                        onChange={() => toggleGateCheck(c.id)}
                      />
                      {c.label}
                    </label>
                  </li>
                ))}
              </ul>
            </section>
          )}
          <OpsButtons items={opsItems} />
        </PovStage>
        <div className="rail">
          <JobCard compact />
          <FieldCamera station="gate" />
          <WorkLogPanel
            title={scene.id === 'scene-pick-dock' ? '复核记录' : '门岗作业记录'}
            logs={gate}
            tone="radio"
          />
        </div>
      </div>
    )
  }

  const counter = logs.filter((l) => l.channel === 'counter')
  return (
    <div className="stage-grid">
      <PovStage station="counter" phase={job.phase}>
        <OpsButtons items={opsItems} />
      </PovStage>
      <div className="rail">
        <JobCard compact />
        <FieldCamera station="counter" />
        <WorkLogPanel
          title={scene.id === 'scene-pick-dock' ? '月台交接记录' : '提货窗口记录'}
          logs={counter}
        />
      </div>
    </div>
  )
}

export function SceneApp() {
  const { productName, scene, activeStation, reset, setStation, switchScene } = useApp()
  const mod = getScene(scene.id)
  const meta = mod.stationMeta[activeStation]
  const [mode, setMode] = useState<UiMode>(() => loadUi())
  const [role, setRole] = useState<GuideRole>(() => mod.defaultGuideRole)

  useEffect(() => {
    try {
      localStorage.setItem(UI_KEY, mode)
    } catch {
      /* ignore */
    }
  }, [mode])

  useEffect(() => {
    try {
      localStorage.setItem(ROLE_KEY, `${scene.id}:${role}`)
    } catch {
      /* ignore */
    }
  }, [role, scene.id])

  useEffect(() => {
    setRole(getScene(scene.id).defaultGuideRole)
  }, [scene.id])

  useEffect(() => {
    if (mode === 'guide') {
      const st = BASE_GUIDE_ROLE_STATION[role]
      if (st) setStation(st)
    }
  }, [mode, role, setStation])

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="brand">{productName}</p>
          <h1>{scene.name}</h1>
          <p className="brief">{scene.brief}</p>
        </div>
        <div className="top-actions">
          <button
            type="button"
            className={`btn ${mode === 'guide' ? 'primary' : 'ghost'}`}
            onClick={() => setMode('guide')}
          >
            现场导引
          </button>
          <button
            type="button"
            className={`btn ${mode === 'station' ? 'primary' : 'ghost'}`}
            onClick={() => setMode('station')}
          >
            完整工位
          </button>
          <button type="button" className="btn ghost" onClick={reset}>
            重置本场
          </button>
        </div>
      </header>

      <section className="catalog">
        <span className="catalog-label">场景模块</span>
        {SCENE_CATALOG.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`scene-pill ${c.id === scene.id ? 'active' : ''} ${c.status === 'planned' ? 'planned' : ''}`}
            disabled={c.status === 'planned'}
            onClick={() => switchScene(c.id)}
          >
            {c.name}
            {c.status === 'planned' ? ' · 待加' : ''}
          </button>
        ))}
      </section>

      {mode === 'guide' ? (
        <GuideView role={role} onRole={setRole} onOpenStation={() => setMode('station')} />
      ) : (
        <>
          <StationTabs />
          <div className="station-hd">
            <strong>{meta.title}</strong>
            <span>
              {meta.role} · {meta.purpose} · 第一人称实景
            </span>
            <button type="button" className="btn ghost sm" onClick={() => setMode('guide')}>
              返回导引
            </button>
          </div>
          <StationBody />
        </>
      )}

      <footer className="foot">
        链场 OS · 物流供应链现场操作系统 · 导引办单，工位协同，工作语言办事
      </footer>
    </div>
  )
}
