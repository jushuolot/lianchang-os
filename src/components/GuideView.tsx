import { useId, useRef, useState, type ChangeEvent } from 'react'
import { useApp } from '../context/SceneContext'
import {
  GUIDE_ROLE_LABEL,
  GUIDE_ROLE_STATION,
  SCENE_PROGRESS,
  progressDone,
  resolveGuideStep,
  type GuideRole,
} from '../guide'
import { YardMap } from './YardMap'
import { compressFieldPhoto } from '../lib/compressImage'

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
  const { job, run, gateChecks, toggleGateCheck, addPhoto, photos, setStation } = app
  const step = resolveGuideStep(app, role)
  const [tip, setTip] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const shotDone = step.photoKind
    ? photos.some((p) => p.kind === step.photoKind)
    : false

  function flash(msg: string) {
    setTip(msg)
    window.setTimeout(() => setTip(null), 2400)
  }

  function doAction(action: string) {
    setStation(GUIDE_ROLE_STATION[role])
    flash(run(action).tip)
  }

  async function onPhoto(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !step.photoKind) return
    const station = GUIDE_ROLE_STATION[role]
    if (station === 'dispatch') {
      flash('调度台无需拍照')
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
        {(Object.keys(GUIDE_ROLE_LABEL) as GuideRole[]).map((r) => (
          <button
            key={r}
            type="button"
            role="tab"
            aria-selected={role === r}
            className={role === r ? 'on' : ''}
            onClick={() => {
              onRole(r)
              setStation(GUIDE_ROLE_STATION[r])
            }}
          >
            {GUIDE_ROLE_LABEL[r]}
          </button>
        ))}
      </div>

      <ol className="guide-progress">
        {SCENE_PROGRESS.map((p) => (
          <li key={p.id} className={progressDone(job.phase, p.phases) ? 'done' : ''}>
            {p.label}
          </li>
        ))}
      </ol>

      <div className="guide-layout">
        <div className="guide-main">
          <header className="guide-step-hd">
            <p className="guide-kicker">
              {GUIDE_ROLE_LABEL[role]} · 现场导引
              {step.done ? ' · 已完成' : ''}
            </p>
            <h2>{step.title}</h2>
            <p className="guide-where">{step.where}</p>
          </header>

          <div className="guide-visual">
            <figure className="guide-pov">
              <img src={step.image} alt={step.imageCaption} />
              <figcaption>{step.imageCaption}</figcaption>
            </figure>
            <YardMap current={step.mapPoint} next={step.nextPoint} />
          </div>

          <section className="guide-req">
            <h3>本步要求</h3>
            <ul>
              {step.requirements.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </section>

          {role === 'gate' && job.phase === 'arrived_gate' && (
            <section className="guide-checks">
              <h3>入场核验项</h3>
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
            {step.photoKind && role !== 'dispatcher' && (
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
                <dt>通行口令</dt>
                <dd className="code">{job.passCode}</dd>
              </div>
              <div>
                <dt>运力</dt>
                <dd>
                  {job.driverName} · {job.plate}
                </dd>
              </div>
            </dl>
          </div>
          <p className="guide-help">
            地图标出你在哪、下一步去哪；图片是当前节点实景；按「本步要求」完成单一操作即可。熟悉后可切换完整工位。
          </p>
          <button type="button" className="btn ghost" onClick={onOpenStation}>
            切换完整工位
          </button>
        </aside>
      </div>
    </div>
  )
}
