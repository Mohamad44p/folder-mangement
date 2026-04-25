import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import pngToIco from "png-to-ico"
import sharp from "sharp"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const src = resolve(root, "build", "icon.png")
const out = resolve(root, "build", "icon.ico")

// Standard Windows shell icon sizes — without 256 the desktop / Start
// menu / taskbar fall back to the generic Electron icon at hi-DPI.
const sizes = [16, 24, 32, 48, 64, 128, 256]

const srcBuf = readFileSync(src)
const resized = await Promise.all(
  sizes.map((size) =>
    sharp(srcBuf)
      .resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer(),
  ),
)

const ico = await pngToIco(resized)
writeFileSync(out, ico)
console.log(`wrote ${out} (${ico.length} bytes, ${sizes.length} sizes)`)
