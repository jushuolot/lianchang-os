import { useId, useRef, useState, type ChangeEvent } from 'react'
import { useApp } from '../context/SceneContext'
import {
  guideRolesFor,
  resolveGuideStep,
  sceneProgress,
  progressDone,
  type GuideRole,
} from '../guide'
import { getScene } from '../scenes'
import { YardMap } from './YardMap'
import { compressFieldPhoto } from '../lib/compressImage'
import { BASE_GUIDE_ROLE_STATION } from '../guideShared'
import { phaseLabelFor } from '../types'

export function GuideView({
  role,
  onRole,
  onOpenStation,
}: {
  role: GuideRole
  onRole: (r: GuideRole) => void
  onOpenStation: () => void
}) {
  const app = useApp()
  const { job, run, gateChecks, toggleGateCheck, addPhoto, photos, setStation, scene } = app
  const mod = getScene(scene.id)
  const roles = guideRolesFor(app)
  const progress = sceneProgress(app)
  const step = resolveGuideStep(app, role)
  const [tip, setTip] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const shotDone = step.photoKind
    ? photos.some((p) => p.kind === step.photoKind)
    : false
  const roleMeta = roles.find((r) => r.id === role)
  const showChecks =
    (scene.id === 'scene-self-pickup' && role === 'gate' && job.phase === 'arrived_gate') ||
    (scene.id === 'scene-pick-dock' && role === 'checker' && job.phase === 'picked')

  function flash(msg: string) {
    setTip(msg)
    window.setTimeout(() => setTip(null), 2400)
  }

  function doAction(action: string) {
    const st = BASE_GUIDE_ROLE_STATION[role]
    if (st) setStation(st)
    flash(run(action).tip)
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !step.photoKind) return
    const station = BASE_GUIDE_ROLE_STATION[role]
    if (!station || station === 'dispatch') {
      flash('本岗无需拍照')
      return
    }
    setBusy(true)
    try {
      const dataUrl = await compressFieldPhoto(file)
      flash(
        addPhoto({
          station,
          kind: step.photoKind,
          label: step.photoLabel ?? '现场照',
          dataUrl,
        }).tip,
      )
    } catch {
      flash('照片处理失败')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="guide">
      <div className="guide-roles" role="tablist" aria-label="选择操作者">
        {roles.map((r) => (
          <button
            key={r.id}
            type="button"
            role="tab"
            aria-selected={role === r.id}
            className={role === r.id ? 'on' : ''}
            onClick={() => {
              onRole(r.id)
              setStation(r.station)
            }}
          >
            {r.label}
          </button>
        ))}
      </div>

      <ol
        className="guide-progress"
        style={{ gridTemplateColumns: `repeat(${progress.length}, 1fr)` }}
      >
        {progress.map((p) => (
          <li key={p.id} className={progressDone(job.phase, p.phases) ? 'done' : ''}>
            {p.label}
          </li>
        ))}
      </ol>

      <div className="guide-layout">
        <div className="guide-main">
          <header className="guide-step-hd">
            <p className="guide-kicker">
              {roleMeta?.label ?? role} · 现场导引
              {step.done ? ' · 已完成' : ''}
            </p>
            <h2>{step.title}</h2>
            <p className="guide-where">{step.where}</p>
            <p className="guide-phase">{phaseLabelFor(job.phase, mod.phaseLabel)}</p>
          </header>

          <div className="guide-visual">
            <figure className="guide-pov">
              <img src={step.image} alt={step.imageCaption} />
              <figcaption>{step.imageCaption}</figcaption>
            </figure>
            <YardMap
              current={step.mapPoint}
              next={step.nextPoint}
              layout={mod.mapLayout}
              points={mod.mapPoints}
            />
          </div>

          <section className="guide-req">
            <h3>本步要求</h3>
            <ul>
              {step.requirements.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          {showChecks && (
            <section className="guide-checks">
              <h3>{scene.id === 'scene-pick-dock' ? '复核项' : '入场核验项'}</h3>
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
          )}

          {tip && <div className="tip">{tip}</div>}
          {step.waiting && !step.primary && <p className="guide-wait">{step.waiting}</p>}

          <div className="guide-actions">
            {step.photoKind && (
              <>
                <input
                  id={inputId}
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="sr-only"
                  onChange={onPhoto}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => fileRef.current?.click()}
                >
                  {shotDone ? '已拍照 · 可重拍' : `拍照：${step.photoLabel}`}
                </button>
              </>
            )}
            {step.primary && (
              <button
                type="button"
                className="btn primary guide-cta"
                onClick={() => doAction(step.primary!.action)}
              >
                {step.primary.label}
              </button>
            )}
          </div>
        </div>

        <aside className="guide-side">
          <div className="job-card compact">
            <div className="job-ref">{job.refNo}</div>
            <h3>{job.title}</h3>
            <dl className="job-dl">
              <div>
                <dt>作业点</dt>
                <dd>
                  {job.warehouse} {job.dock}
                </dd>
              </div>
              <div>
                <dt>{scene.id === 'scene-pick-dock' ? '库位路径' : '通行口令'}</dt>
                <dd className="code">{job.passCode}</dd>
              </div>
              <div>
                <dt>{scene.id === 'scene-pick-dock' ? '拣货员' : '运力'}</dt>
                <dd>
                  {job.driverName}
                  {scene.id === 'scene-pick-dock' ? '' : ` · ${job.plate}`}
                </dd>
              </div>
            </dl>
          </div>
          <p className="guide-help">
            地图标出你在哪、下一步去哪；图片是当前节点实景；按「本步要求」完成单一操作即可。
          </p>
          <button type="button" className="btn ghost" onClick={onOpenStation}>
            切换完整工位
          </button>
        </aside>
      </div>
    </div>
  )
}
