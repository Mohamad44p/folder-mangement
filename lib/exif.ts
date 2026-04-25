// Mock EXIF data — deterministic based on file id/name so it's stable.
// In a real app, swap with a real EXIF parser like exifreader.

const CAMERAS = [
  { make: "Canon", model: "EOS R5", lens: "RF 24-70mm f/2.8" },
  { make: "Sony", model: "α7 IV", lens: "FE 24-105mm f/4" },
  { make: "Nikon", model: "Z 9", lens: "Z 35mm f/1.8 S" },
  { make: "Fujifilm", model: "X-T5", lens: "XF 16-55mm f/2.8" },
  { make: "Apple", model: "iPhone 15 Pro", lens: "Main 24mm" },
]

const APERTURES = ["f/1.8", "f/2.8", "f/4.0", "f/5.6", "f/8.0"]
const SHUTTERS = ["1/60", "1/125", "1/250", "1/500", "1/1000"]
const ISOS = ["100", "200", "400", "800", "1600"]

function hashCode(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return Math.abs(h)
}

export function mockExif(fileId: string, name: string): Record<string, string> {
  const h = hashCode(fileId + name)
  const cam = CAMERAS[h % CAMERAS.length]
  return {
    Camera: `${cam.make} ${cam.model}`,
    Lens: cam.lens,
    Aperture: APERTURES[h % APERTURES.length],
    Shutter: SHUTTERS[(h >> 3) % SHUTTERS.length],
    ISO: ISOS[(h >> 5) % ISOS.length],
    "Focal length": `${24 + (h % 100)}mm`,
    "White balance": h % 2 === 0 ? "Auto" : "Daylight",
  }
}

export function mockGeo(fileId: string): { lat: number; lng: number } | null {
  const h = hashCode(fileId)
  if (h % 5 === 0) return null
  // Spread across plausible global coordinates
  const lat = ((h % 1800) / 10) - 90
  const lng = (((h >> 7) % 3600) / 10) - 180
  return { lat: Number(lat.toFixed(4)), lng: Number(lng.toFixed(4)) }
}
