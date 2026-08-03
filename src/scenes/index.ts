import type { SceneId, SceneModule } from './types'
import { selfPickupScene } from './selfPickup'
import { pickDockScene } from './pickToDock'
import type { AppState } from '../types'

export const SCENES: SceneModule[] = [selfPickupScene, pickDockScene]

export const SCENE_CATALOG = [
  ...SCENES.map((s) => ({
    id: s.id,
    name: s.name,
    status: s.status,
  })),
  { id: 'scene-linehaul', name: '干线提送 · 双端准入', status: 'planned' as const },
  { id: 'scene-exception', name: '在途异常 · 现场处置', status: 'planned' as const },
]

export function getScene(id: string | undefined): SceneModule {
  return SCENES.find((s) => s.id === id) ?? selfPickupScene
}

export function seedScene(id: SceneId | string = 'scene-self-pickup'): AppState {
  return getScene(id).seed()
}

/** @deprecated 使用 seedScene */
export function seedApp(): AppState {
  return seedScene('scene-self-pickup')
}
