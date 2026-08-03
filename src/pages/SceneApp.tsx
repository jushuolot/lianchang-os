import { useState } from 'react'
import { useApp } from '../context/SceneContext'
import { PHASE_LABEL, STATION_META, type StationId } from '../types'
import { WorkLogPanel } from '../components/ChatThread'
import { PovStage } from '../components/PovStage'
import { SCENE_CATALOG } from '../seed'

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
  const { job, seals } = useApp()
  return (
    <aside className={`job-card ${compact ? 'compact' : ''}`}>
      <div className="job-ref">{job.refNo}</div>
      <h3>{job.title}</h3>
      {!compact && <p className="job-summary">{job.summary}</p>}
      <dl className="job-dl">
        <div>
          <dt>状态</dt>
          <dd>{PHASE_LABEL[job.phase]}</dd>
        </div>
        <div>
          <dt>作业点</dt>
          <dd>
            {job.warehouse} {job.dock}
          </dd>
        </div>
        <div>
          <dt>运力</dt>
          <dd>
            {job.driverName} · {job.plate}
          </dd>
        </div>
        {!compact && (
          <div>
            <dt>提货人</dt>
            <dd>{job.customerName}</dd>
          </div>
        )}
        <div>
          <dt>通行口令</dt>
          <dd className="code">{job.passCode}</dd>
        </div>
      </dl>
      {!compact && (
        <ul className="job-notes">
          {job.checklist.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
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
  const { activeStation, setStation } = useApp()
  return (
    <nav className="tabs">
      {(Object.keys(STATION_META) as StationId[]).map((id) => (
        <button
          key={id}
          type="button"
          className={activeStation === id ? 'on' : ''}
          onClick={() => setStation(id)}
        >
          <span>{STATION_META[id].title}</span>
          <small>{STATION_META[id].role}</small>
        </button>
      ))}
    </nav>
  )
}

function StationBody() {
  const { activeStation, logs, gateChecks, toggleGateCheck, job } = useApp()

  if (activeStation === 'dispatch') {
    const ops = logs.filter((l) => l.channel === 'ops')
    return (
      <div className="stage-grid">
        <PovStage station="dispatch" phase={job.phase}>
          <OpsButtons
            items={[
              { action: 'dispatch', label: '下达派车指令', primary: true },
              { action: 'arrive_gate', label: '登记：司机到闸' },
            ]}
          />
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
          <OpsButtons
            items={[
              { action: 'arrive_gate', label: '到闸报到', primary: true },
              { action: 'ready', label: '申报备货完成' },
            ]}
          />
        </PovStage>
        <div className="rail">
          <JobCard compact />
          <WorkLogPanel title="我的任务动态" logs={ops} />
        </div>
      </div>
    )
  }

  if (activeStation === 'gate') {
    const gate = logs.filter((l) => l.channel === 'gate')
    return (
      <div className="stage-grid">
        <PovStage station="gate" phase={job.phase}>
          <section className="hud-panel">
            <h2>入场核验</h2>
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
          <OpsButtons
            items={[
              { action: 'admit', label: '核验通过 · 准予入场', primary: true },
              { action: 'depart', label: '离场核验 · 准予驶离' },
            ]}
          />
        </PovStage>
        <div className="rail">
          <JobCard compact />
          <WorkLogPanel title="门岗作业记录" logs={gate} tone="radio" />
        </div>
      </div>
    )
  }

  const counter = logs.filter((l) => l.channel === 'counter')
  return (
    <div className="stage-grid">
      <PovStage station="counter" phase={job.phase}>
        <OpsButtons
          items={[
            { action: 'counter_checkin', label: '提货人报到', primary: true },
            { action: 'sign', label: '点件签收确认' },
          ]}
        />
      </PovStage>
      <div className="rail">
        <JobCard compact />
        <WorkLogPanel title="提货窗口记录" logs={counter} />
      </div>
    </div>
  )
}

export function SceneApp() {
  const { productName, scene, activeStation, reset } = useApp()
  const meta = STATION_META[activeStation]

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="brand">{productName}</p>
          <h1>{scene.name}</h1>
          <p className="brief">{scene.brief}</p>
        </div>
        <button type="button" className="btn ghost" onClick={reset}>
          重置本场
        </button>
      </header>

      <section className="catalog">
        <span className="catalog-label">场景模块</span>
        {SCENE_CATALOG.map((c) => (
          <span
            key={c.id}
            className={`scene-pill ${c.status === 'active' ? 'active' : 'planned'}`}
          >
            {c.name}
            {c.status === 'planned' ? ' · 待加' : ''}
          </span>
        ))}
      </section>

      <StationTabs />

      <div className="station-hd">
        <strong>{meta.title}</strong>
        <span>
          {meta.role} · {meta.purpose} · 第一人称实景
        </span>
      </div>

      <StationBody />

      <footer className="foot">
        链场 OS · 物流供应链现场操作系统 · 流程即场景，工位协同，工作语言办事
      </footer>
    </div>
  )
}
