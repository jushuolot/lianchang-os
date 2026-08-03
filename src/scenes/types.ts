/** 场景插件契约 */

import type { AppState, JobPhase, StationId } from '../types'
import type { GuideRole, GuideStep, MapPoint } from '../guideShared'

export type SceneId = 'scene-self-pickup' | 'scene-pick-dock'

export interface SceneProgressItem {
  id: string
  label: string
  phases: JobPhase[]
}

export interface SceneGuideRole {
  id: GuideRole
  label: string
  station: StationId
}

export interface SceneModule {
  id: SceneId
  name: string
  status: 'active' | 'planned'
  brief: string
  seed: () => AppState
  run: (state: AppState, action: string) => { state: AppState; tip: string; ok: boolean }
  guideRoles: SceneGuideRole[]
  defaultGuideRole: GuideRole
  resolveGuide: (state: AppState, role: GuideRole) => GuideStep
  progress: SceneProgressItem[]
  stationMeta: Record<StationId, { title: string; role: string; purpose: string }>
  phaseLabel: Partial<Record<JobPhase, string>>
  /** 园区/仓内示意地图样式 */
  mapLayout: 'yard' | 'warehouse'
  mapPoints?: { id: MapPoint; label: string; x: number; y: number }[]
}

export type { GuideRole, GuideStep, MapPoint }
