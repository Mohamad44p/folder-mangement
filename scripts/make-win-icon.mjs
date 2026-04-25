import { readFileSync, writeFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { dirname, resolve } from "node:path"
import pngToIco from "png-to-ico"

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, "..")
const src = resolve(root, "build", "icon.png")
const out = resolve(root, "build", "icon.ico")

const buf = await pngToIco(readFileSync(src))
writeFileSync(out, buf)
console.log(`wrote ${out} (${buf.length} bytes)`)
