import type { ReactNode } from 'react'
import { resolvePov } from '../pov'
import type { JobPhase, StationId } from '../types'

export function PovStage({
  station,
  phase,
  children,
}: {
  station: StationId
  phase: JobPhase
  children?: ReactNode
}) {
  const pov = resolvePov(station, phase)

  return (
    <section className="pov" aria-label="第一人称现场视口">
      <div className="pov-frame">
        <img
          key={pov.src + phase + station}
          className="pov-img"
          src={pov.src}
          alt={`${pov.stance}：${pov.focus}`}
        />
        <div className="pov-vignette" aria-hidden />
        <div className="pov-meta">
          <span className="pov-stance">{pov.stance}</span>
          <span className="pov-focus">视线 · {pov.focus}</span>
        </div>
        {children ? <div className="pov-hud">{children}</div> : null}
      </div>
    </section>
  )
}
