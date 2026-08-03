import type { FieldShotKind } from './fieldPhoto'
import type { JobPhase, StationId } from './types'

export type MapPoint =
  | 'road'
  | 'gate'
  | 'yard'
  | 'dock'
  | 'counter'
  | 'exit'
  | 'dispatch'
  | 'aisle'
  | 'check'

export type GuideRole =
  | 'customer'
  | 'driver'
  | 'gate'
  | 'dispatcher'
  | 'picker'
  | 'checker'
  | 'dock'

export interface GuideStep {
  id: string
  role: GuideRole
  title: string
  where: string
  mapPoint: MapPoint
  nextPoint?: MapPoint
  image: string
  imageCaption: string
  requirements: string[]
  primary?: { action: string; label: string }
  waiting?: string
  photoKind?: FieldShotKind
  photoLabel?: string
  done?: boolean
}

export function progressDone(phase: JobPhase, itemPhases: JobPhase[]) {
  return itemPhases.includes(phase)
}

export const BASE_GUIDE_ROLE_STATION: Partial<Record<GuideRole, StationId>> = {
  customer: 'counter',
  driver: 'driver',
  gate: 'gate',
  dispatcher: 'dispatch',
  picker: 'driver',
  checker: 'gate',
  dock: 'counter',
}
