import { useEffect, useId, useRef, useState, type ChangeEvent } from 'react'
import { useApp } from '../context/SceneContext'
import { FIELD_SHOT_OPTIONS, type FieldShotKind } from '../fieldPhoto'
import { captureFromVideo, compressFieldPhoto } from '../lib/compressImage'

type TerminalStation = 'driver' | 'gate' | 'counter'

export function FieldCamera({ station }: { station: TerminalStation }) {
  const { photos, addPhoto, removePhoto } = useApp()
  const options = FIELD_SHOT_OPTIONS[station]
  const [kind, setKind] = useState<FieldShotKind>(options[0].kind)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [live, setLive] = useState(false)
  const inputId = useId()
  const fileRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mine = photos.filter((p) => p.station === station)
  const current = options.find((o) => o.kind === kind) ?? options[0]

  useEffect(() => {
    return () => stopLive()
  }, [])

  function stopLive() {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setLive(false)
  }

  async function startLive() {
    setErr(null)
    if (!window.isSecureContext) {
      setErr('需 HTTPS 或本地环境才能打开摄像头，请改用「手机拍照」')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      })
      streamRef.current = stream
      setLive(true)
      requestAnimationFrame(() => {
        const v = videoRef.current
        if (!v) return
        v.srcObject = stream
        void v.play()
      })
    } catch {
      setErr('无法打开摄像头，请用「手机拍照」或检查权限')
    }
  }

  async function snapLive() {
    const v = videoRef.current
    if (!v || !streamRef.current) return
    setBusy(true)
    setErr(null)
    try {
      const dataUrl = await captureFromVideo(v)
      const r = addPhoto({ station, kind: current.kind, label: current.label, dataUrl })
      if (!r.ok) setErr(r.tip)
      else stopLive()
    } catch {
      setErr('取景失败，请重试')
    } finally {
      setBusy(false)
    }
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBusy(true)
    setErr(null)
    try {
      const dataUrl = await compressFieldPhoto(file)
      const r = addPhoto({ station, kind: current.kind, label: current.label, dataUrl })
      if (!r.ok) setErr(r.tip)
    } catch {
      setErr('照片处理失败，请换一张重试')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="field-cam">
      <header className="field-cam-hd">
        <h2>现场取证</h2>
        <span>终端 · 手机拍照</span>
      </header>

      <div className="field-cam-kinds">
        {options.map((o) => (
          <button
            key={o.kind}
            type="button"
            className={kind === o.kind ? 'on' : ''}
            onClick={() => setKind(o.kind)}
          >
            {o.label}
          </button>
        ))}
      </div>
      <p className="field-cam-hint">{current.hint}</p>

      <div className="field-cam-actions">
        <input
          id={inputId}
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={onFile}
        />
        <button
          type="button"
          className="btn primary"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? '处理中…' : '手机拍照'}
        </button>
        {!live ? (
          <button type="button" className="btn" disabled={busy} onClick={() => void startLive()}>
            打开后置取景
          </button>
        ) : (
          <>
            <button type="button" className="btn primary" disabled={busy} onClick={() => void snapLive()}>
              按快门
            </button>
            <button type="button" className="btn" onClick={stopLive}>
              关闭取景
            </button>
          </>
        )}
      </div>

      {err && <p className="field-cam-err">{err}</p>}

      {live && (
        <div className="field-live">
          <video ref={videoRef} playsInline muted autoPlay />
          <span>后置取景 · {current.label}</span>
        </div>
      )}

      {mine.length > 0 && (
        <ul className="field-shots">
          {mine.map((p) => (
            <li key={p.id}>
              <img src={p.dataUrl} alt={p.label} />
              <div>
                <strong>{p.label}</strong>
                <time>{p.at}</time>
              </div>
              <button type="button" className="btn ghost sm" onClick={() => removePhoto(p.id)}>
                删除
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
