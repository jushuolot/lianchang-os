/** 导引兼容层：按当前场景解析 */
export type { GuideRole, GuideStep, MapPoint } from './guideShared'
export { progressDone, BASE_GUIDE_ROLE_STATION as GUIDE_ROLE_STATION_MAP } from './guideShared'
export { getScene } from './scenes'

import type { AppState } from './types'
import type { GuideRole, GuideStep } from './guideShared'
import { getScene } from './scenes'
import { BASE_GUIDE_ROLE_STATION } from './guideShared'

export function GUIDE_ROLE_STATION(role: GuideRole) {
  return BASE_GUIDE_ROLE_STATION[role] ?? 'dispatch'
}

export function resolveGuideStep(state: AppState, role: GuideRole): GuideStep {
  return getScene(state.scene.id).resolveGuide(state, role)
}

export function guideRolesFor(state: AppState) {
  return getScene(state.scene.id).guideRoles
}

export function sceneProgress(state: AppState) {
  return getScene(state.scene.id).progress
}

/** @deprecated 使用 sceneProgress */
export const SCENE_PROGRESS = getScene('scene-self-pickup').progress

export const GUIDE_ROLE_LABEL: Record<string, string> = {
  customer: '提货人',
  driver: '司机',
  gate: '门岗',
  dispatcher: '调度',
  picker: '拣货员',
  checker: '复核',
  dock: '月台',
}
