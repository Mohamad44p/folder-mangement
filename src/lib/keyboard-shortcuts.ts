import type { TranslationKey } from "./i18n-dict"

export interface ShortcutDef {
  id: string
  label: string
  labelKey: TranslationKey
  defaultKeys: string
  category: "Navigation" | "Editing" | "View" | "Selection"
  categoryKey: TranslationKey
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: "search", label: "Open search palette", labelKey: "shortcuts.action.search", defaultKeys: "Mod+K", category: "Navigation", categoryKey: "shortcuts.cat.navigation" },
  { id: "newFolder", label: "Create new folder", labelKey: "shortcuts.action.createNewFolder", defaultKeys: "Mod+N", category: "Editing", categoryKey: "shortcuts.cat.editing" },
  { id: "newTemplate", label: "New from template", labelKey: "shortcuts.action.newFromTemplate", defaultKeys: "Mod+Shift+N", category: "Editing", categoryKey: "shortcuts.cat.editing" },
  { id: "closeFolder", label: "Close current folder", labelKey: "shortcuts.action.closeFolder", defaultKeys: "Escape", category: "Navigation", categoryKey: "shortcuts.cat.navigation" },
  { id: "reopenClosed", label: "Reopen recently closed", labelKey: "shortcuts.action.reopenRecent", defaultKeys: "Mod+Shift+T", category: "Navigation", categoryKey: "shortcuts.cat.navigation" },
  { id: "toggleSidebar", label: "Toggle sidebar", labelKey: "shortcuts.action.toggleSidebar", defaultKeys: "Mod+B", category: "View", categoryKey: "shortcuts.cat.view" },
  { id: "toggleSettings", label: "Open settings", labelKey: "shortcuts.action.toggleSettings", defaultKeys: "Mod+,", category: "View", categoryKey: "shortcuts.cat.view" },
  { id: "selectAll", label: "Select all files", labelKey: "shortcuts.action.selectAllFiles", defaultKeys: "Mod+A", category: "Selection", categoryKey: "shortcuts.cat.selection" },
  { id: "deleteSelected", label: "Delete selection", labelKey: "shortcuts.action.deleteSelection", defaultKeys: "Delete", category: "Editing", categoryKey: "shortcuts.cat.editing" },
  { id: "favorite", label: "Toggle favorite", labelKey: "shortcuts.action.favorite", defaultKeys: "F", category: "Editing", categoryKey: "shortcuts.cat.editing" },
  { id: "rename", label: "Rename", labelKey: "shortcuts.action.rename", defaultKeys: "F2", category: "Editing", categoryKey: "shortcuts.cat.editing" },
  { id: "duplicate", label: "Duplicate", labelKey: "shortcuts.action.duplicate", defaultKeys: "Mod+D", category: "Editing", categoryKey: "shortcuts.cat.editing" },
]

export function matchKeys(e: KeyboardEvent, keys: string): boolean {
  const parts = keys.split("+").map((k) => k.trim())
  const expected = {
    mod: parts.includes("Mod"),
    shift: parts.includes("Shift"),
    alt: parts.includes("Alt"),
    key: parts[parts.length - 1].toLowerCase(),
  }
  const actual = {
    mod: e.metaKey || e.ctrlKey,
    shift: e.shiftKey,
    alt: e.altKey,
    key: e.key.toLowerCase(),
  }
  return (
    actual.mod === expected.mod &&
    actual.shift === expected.shift &&
    actual.alt === expected.alt &&
    (actual.key === expected.key || (expected.key === "delete" && actual.key === "backspace"))
  )
}

export function formatKeys(keys: string): string {
  return keys
    .split("+")
    .map((k) => {
      if (k === "Mod") return navigator.platform.includes("Mac") ? "⌘" : "Ctrl"
      if (k === "Shift") return "⇧"
      if (k === "Alt") return navigator.platform.includes("Mac") ? "⌥" : "Alt"
      if (k === "Escape") return "Esc"
      if (k === "Delete") return "Del"
      return k
    })
    .join(navigator.platform.includes("Mac") ? "" : "+")
}
