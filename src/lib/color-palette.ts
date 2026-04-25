// Quantize image to top N dominant colors using simple bucket-based approach.
export async function extractPalette(url: string, count = 5): Promise<string[]> {
  if (typeof window === "undefined") return []
  try {
    const img = await loadImage(url)
    const canvas = document.createElement("canvas")
    const w = (canvas.width = 64)
    const h = (canvas.height = 64)
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return []
    ctx.drawImage(img, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data
    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>()
    for (let i = 0; i < data.length; i += 4) {
      const a = data[i + 3]
      if (a < 128) continue
      const r = data[i] & 0xf0
      const g = data[i + 1] & 0xf0
      const b = data[i + 2] & 0xf0
      const key = `${r},${g},${b}`
      const entry = buckets.get(key)
      if (entry) {
        entry.r += data[i]
        entry.g += data[i + 1]
        entry.b += data[i + 2]
        entry.count++
      } else {
        buckets.set(key, { r: data[i], g: data[i + 1], b: data[i + 2], count: 1 })
      }
    }
    const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count)
    return sorted.slice(0, count).map((s) => {
      const r = Math.round(s.r / s.count)
      const g = Math.round(s.g / s.count)
      const b = Math.round(s.b / s.count)
      return rgbToHex(r, g, b)
    })
  } catch {
    return []
  }
}

export async function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

export async function getDimensions(url: string): Promise<{ width: number; height: number } | null> {
  try {
    const img = await loadImage(url)
    return { width: img.naturalWidth, height: img.naturalHeight }
  } catch {
    return null
  }
}

export function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => n.toString(16).padStart(2, "0")
  return `#${h(r)}${h(g)}${h(b)}`
}

export function hexDistance(a: string, b: string): number {
  const ar = parseInt(a.slice(1, 3), 16)
  const ag = parseInt(a.slice(3, 5), 16)
  const ab = parseInt(a.slice(5, 7), 16)
  const br = parseInt(b.slice(1, 3), 16)
  const bg = parseInt(b.slice(3, 5), 16)
  const bb = parseInt(b.slice(5, 7), 16)
  return Math.sqrt((ar - br) ** 2 + (ag - bg) ** 2 + (ab - bb) ** 2)
}

export async function pickColorAt(
  url: string,
  xPercent: number,
  yPercent: number,
): Promise<string | null> {
  try {
    const img = await loadImage(url)
    const canvas = document.createElement("canvas")
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const x = Math.floor((xPercent / 100) * canvas.width)
    const y = Math.floor((yPercent / 100) * canvas.height)
    const [r, g, b] = ctx.getImageData(x, y, 1, 1).data
    return rgbToHex(r, g, b)
  } catch {
    return null
  }
}
