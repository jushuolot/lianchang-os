/** 压缩现场照片，避免撑爆 localStorage */
export async function compressFieldPhoto(file: File, maxEdge = 1280, quality = 0.72): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    bitmap.close()
    throw new Error('无法处理图片')
  }
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvas.toDataURL('image/jpeg', quality)
}

export async function captureFromVideo(
  video: HTMLVideoElement,
  maxEdge = 1280,
  quality = 0.72,
): Promise<string> {
  const vw = video.videoWidth || 1280
  const vh = video.videoHeight || 720
  const scale = Math.min(1, maxEdge / Math.max(vw, vh))
  const w = Math.max(1, Math.round(vw * scale))
  const h = Math.max(1, Math.round(vh * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('无法处理图片')
  ctx.drawImage(video, 0, 0, w, h)
  return canvas.toDataURL('image/jpeg', quality)
}
