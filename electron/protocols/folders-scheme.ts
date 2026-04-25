import { protocol, net } from "electron"
import * as fs from "node:fs"
import * as path from "node:path"
import { pathToFileURL } from "node:url"
import type Database from "better-sqlite3"
import { Queries } from "../db/queries"

const SCHEME = "folders"

const ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function registerFoldersSchemePrivilege(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        bypassCSP: false,
        stream: true,
        corsEnabled: true,
      },
    },
  ])
}

export function registerFoldersScheme(db: Database.Database): void {
  const q = new Queries(db)
  protocol.handle(SCHEME, async (request) => {
    const url = new URL(request.url)
    // folders://<id>  or  folders://<id>/  or  folders:///<id>
    const id = (url.hostname || url.pathname.replace(/^\//, "")).split("/")[0]
    if (!ID_RE.test(id)) {
      return new Response("Invalid id", { status: 400 })
    }
    const row = q.getFileById.get(id) as
      | { abs_path: string; mime: string | null }
      | undefined
    if (!row || !fs.existsSync(row.abs_path)) {
      return new Response("Not found", { status: 404 })
    }
    const fileUrl = pathToFileURL(path.resolve(row.abs_path)).toString()
    const response = await net.fetch(fileUrl)
    const headers = new Headers(response.headers)
    if (row.mime) headers.set("Content-Type", row.mime)
    headers.set("Cache-Control", "public, max-age=3600")
    return new Response(response.body, {
      status: response.status,
      headers,
    })
  })
}
