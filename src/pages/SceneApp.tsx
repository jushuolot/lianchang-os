import { useState } from 'react'
import { useApp } from '../context/SceneContext'
import { PHASE_LABEL, STATION_META, type StationId } from '../types'
import { WorkLogPanel } from '../components/ChatThread'
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

function JobCard() {
  const { job, seals } = useApp()
  return (
    <aside className="job-card">
      <div className="job-ref">{job.refNo}</div>
      <h3>{job.title}</h3>
      <p className="job-summary">{job.summary}</p>
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
        <div>
          <dt>提货人</dt>
          <dd>{job.customerName}</dd>
        </div>
        <div>
          <dt>通行口令</dt>
          <dd className="code">{job.passCode}</dd>
        </div>
      </dl>
      <ul className="job-notes">
        {job.checklist.map((n) => (
          <li key={n}>{n}</li>
        ))}
      </ul>
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

function DispatchStation() {
  const { logs } = useApp()
  const ops = logs.filter((l) => l.channel === 'ops')
  return (
    <div className="grid">
      <WorkLogPanel title="作业指令 / 回报" logs={ops} />
      <div className="col">
        <JobCard />
        <OpsButtons
          items={[
            { action: 'dispatch', label: '下达派车指令', primary: true },
            { action: 'arrive_gate', label: '登记：司机到闸' },
          ]}
        />
      </div>
    </div>
  )
}

function DriverStation() {
  const { logs } = useApp()
  const ops = logs.filter((l) => l.channel === 'ops' || l.channel === 'gate')
  return (
    <div className="grid phone-layout">
      <div className="device">
        <div className="device-bar">司机端</div>
        <WorkLogPanel title="我的任务动态" logs={ops} />
        <OpsButtons
          items={[
            { action: 'arrive_gate', label: '到闸报到', primary: true },
            { action: 'ready', label: '申报备货完成' },
          ]}
        />
      </div>
      <JobCard />
    </div>
  )
}

function GateStation() {
  const { logs, gateChecks, toggleGateCheck } = useApp()
  const gate = logs.filter((l) => l.channel === 'gate')
  return (
    <div className="grid">
      <WorkLogPanel title="门岗作业记录" logs={gate} tone="radio" />
      <div className="col">
        <section className="panel">
          <header className="panel-hd">
            <h2>入场核验</h2>
          </header>
          <ul className="checks">
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
        <JobCard />
      </div>
    </div>
  )
}

function CounterStation() {
  const { logs } = useApp()
  const counter = logs.filter((l) => l.channel === 'counter')
  return (
    <div className="grid">
      <WorkLogPanel title="提货窗口记录" logs={counter} />
      <div className="col">
        <JobCard />
        <OpsButtons
          items={[
            { action: 'counter_checkin', label: '提货人报到', primary: true },
            { action: 'sign', label: '点件签收确认' },
          ]}
        />
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
          {meta.role} · {meta.purpose}
        </span>
      </div>

      {activeStation === 'dispatch' && <DispatchStation />}
      {activeStation === 'driver' && <DriverStation />}
      {activeStation === 'gate' && <GateStation />}
      {activeStation === 'counter' && <CounterStation />}

      <footer className="foot">
        链场 OS · 物流供应链现场操作系统 · 流程即场景，工位协同，工作语言办事
      </footer>
    </div>
  )
}
