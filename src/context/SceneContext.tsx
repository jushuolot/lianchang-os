import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { getScene, seedScene } from '../scenes'
import type { FieldShot, FieldShotKind } from '../fieldPhoto'
import type { ActorId, AppState, LogKind, StationId, WorkLog } from '../types'
import { uid, clock, log } from '../scenes/helpers'

const KEY = 'lianchang-os-v3'

interface Api extends AppState {
  setStation: (s: StationId) => void
  switchScene: (id: string) => void
  run: (action: string) => { ok: boolean; tip: string }
  toggleGateCheck: (id: string) => void
  addPhoto: (input: {
    station: FieldShot['station']
    kind: FieldShotKind
    label: string
    dataUrl: string
  }) => { ok: boolean; tip: string }
  removePhoto: (id: string) => void
  reset: () => void
  channel: (id: string) => WorkLog[]
}

const Ctx = createContext<Api | null>(null)

const PHOTO_ACTOR: Record<FieldShot['station'], ActorId> = {
  driver: 'driver',
  gate: 'gate',
  counter: 'customer',
}

const PHOTO_CHANNEL: Record<FieldShot['station'], string> = {
  driver: 'ops',
  gate: 'gate',
  counter: 'counter',
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AppState> & { scene?: { id?: string } }
      const base = seedScene(parsed.scene?.id ?? 'scene-self-pickup')
      return {
        ...base,
        ...parsed,
        productName: '链场 OS',
        scene: { ...base.scene, ...parsed.scene },
        photos: Array.isArray(parsed.photos) ? parsed.photos : [],
        gateChecks: parsed.gateChecks ?? base.gateChecks,
        logs: parsed.logs ?? base.logs,
        job: { ...base.job, ...parsed.job },
      }
    }
  } catch {
    /* ignore */
  }
  return seedScene('scene-self-pickup')
}

export function SceneProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(() => load())

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      try {
        localStorage.setItem(
          KEY,
          JSON.stringify({ ...state, photos: state.photos.slice(-4) }),
        )
      } catch {
        /* ignore */
      }
    }
  }, [state])

  const setStation = useCallback((activeStation: StationId) => {
    setState((s) => ({ ...s, activeStation }))
  }, [])

  const switchScene = useCallback((id: string) => {
    setState(seedScene(id))
  }, [])

  const toggleGateCheck = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      gateChecks: s.gateChecks.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    }))
  }, [])

  const addPhoto = useCallback(
    (input: {
      station: FieldShot['station']
      kind: FieldShotKind
      label: string
      dataUrl: string
    }) => {
      let result = { ok: true, tip: '现场照片已归档' }
      setState((s) => {
        if (s.photos.length >= 12) {
          result = { ok: false, tip: '本票取证已满，请删除旧照后再拍' }
          return s
        }
        const shot: FieldShot = {
          id: uid('p'),
          station: input.station,
          kind: input.kind,
          label: input.label,
          dataUrl: input.dataUrl,
          at: clock(),
        }
        const kindLog: LogKind =
          input.station === 'gate' ? 'radio' : input.station === 'counter' ? 'counter' : 'report'
        return {
          ...s,
          photos: [...s.photos, shot],
          seals: s.seals.includes('现场取证') ? s.seals : [...s.seals, '现场取证'],
          logs: [
            ...s.logs,
            log(
              PHOTO_CHANNEL[input.station],
              PHOTO_ACTOR[input.station],
              `现场取证：${input.label}（手机拍照已归档）。`,
              kindLog,
            ),
          ],
        }
      })
      return result
    },
    [],
  )

  const removePhoto = useCallback((id: string) => {
    setState((s) => ({ ...s, photos: s.photos.filter((p) => p.id !== id) }))
  }, [])

  const run = useCallback((action: string) => {
    let result = { ok: true, tip: '' }
    setState((s) => {
      const mod = getScene(s.scene.id)
      const out = mod.run(s, action)
      result = { ok: out.ok, tip: out.tip }
      return out.state
    })
    return result
  }, [])

  const channel = useCallback(
    (id: string) => state.logs.filter((l) => l.channel === id),
    [state.logs],
  )

  const reset = useCallback(() => {
    setState((s) => seedScene(s.scene.id))
  }, [])

  const value = useMemo<Api>(
    () => ({
      ...state,
      setStation,
      switchScene,
      run,
      toggleGateCheck,
      addPhoto,
      removePhoto,
      reset,
      channel,
    }),
    [state, setStation, switchScene, run, toggleGateCheck, addPhoto, removePhoto, reset, channel],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp within SceneProvider')
  return ctx
}
