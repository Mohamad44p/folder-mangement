import type { FolderFile, Project, SmartFolder, SmartFolderRule } from "./data"

export interface SmartFolderResult {
  files: { file: FolderFile; folderId: string; folderTitle: string }[]
  folders: Project[]
}

function matchRule(file: FolderFile, rule: SmartFolderRule): boolean {
  switch (rule.field) {
    case "tag":
      if (rule.op === "has") return (file.tags ?? []).includes(String(rule.value))
      if (rule.op === "contains")
        return (file.tags ?? []).some((t) => t.toLowerCase().includes(String(rule.value).toLowerCase()))
      return false
    case "type":
      if (rule.op === "is") return file.type === rule.value
      return false
    case "favorite":
      if (rule.op === "is") return Boolean(file.favorite) === Boolean(rule.value)
      return false
    case "name":
      if (rule.op === "contains")
        return file.name.toLowerCase().includes(String(rule.value).toLowerCase())
      return false
    case "size":
      if (typeof file.size !== "number") return false
      if (rule.op === "gt") return file.size > Number(rule.value)
      if (rule.op === "lt") return file.size < Number(rule.value)
      return false
    case "uploaded":
      if (rule.op === "within-days") {
        const cutoff = Date.now() - Number(rule.value) * 86_400_000
        try {
          return new Date(file.uploadedAt).getTime() >= cutoff
        } catch {
          return false
        }
      }
      return false
    default:
      return false
  }
}

export function evaluateSmartFolder(smart: SmartFolder, folders: Project[]): SmartFolderResult {
  const files: SmartFolderResult["files"] = []
  for (const folder of folders) {
    if (folder.deletedAt) continue
    for (const file of folder.files ?? []) {
      const ok = smart.matchAll
        ? smart.rules.every((r) => matchRule(file, r))
        : smart.rules.some((r) => matchRule(file, r))
      if (ok) {
        files.push({ file, folderId: String(folder.id), folderTitle: folder.title })
      }
    }
  }
  return { files, folders: [] }
}

export function describeSmartFolder(smart: SmartFolder): string {
  if (smart.rules.length === 0) return "No rules"
  const parts = smart.rules.map((r) => describeRule(r))
  return parts.join(smart.matchAll ? " AND " : " OR ")
}

export function describeRule(rule: SmartFolderRule): string {
  switch (rule.field) {
    case "tag":
      return rule.op === "has" ? `tag = ${rule.value}` : `tag contains "${rule.value}"`
    case "type":
      return `type = ${rule.value}`
    case "favorite":
      return rule.value ? "favorited" : "not favorited"
    case "name":
      return `name contains "${rule.value}"`
    case "size":
      return rule.op === "gt" ? `size > ${rule.value} B` : `size < ${rule.value} B`
    case "uploaded":
      return `uploaded in last ${rule.value} days`
    default:
      return ""
  }
}
