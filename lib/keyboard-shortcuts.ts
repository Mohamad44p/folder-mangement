export interface ShortcutDef {
  id: string
  label: string
  defaultKeys: string
  category: "Navigation" | "Editing" | "View" | "Selection"
}

export const SHORTCUTS: ShortcutDef[] = [
  { id: "search", label: "Open search palette", defaultKeys: "Mod+K", category: "Navigation" },
  { id: "newFolder", label: "Create new folder", defaultKeys: "Mod+N", category: "Editing" },
  { id: "newTemplate", label: "New from template", defaultKeys: "Mod+Shift+N", category: "Editing" },
  { id: "closeFolder", label: "Close current folder", defaultKeys: "Escape", category: "Navigation" },
  { id: "reopenClosed", label: "Reopen recently closed", defaultKeys: "Mod+Shift+T", category: "Navigation" },
  { id: "toggleSidebar", label: "Toggle sidebar", defaultKeys: "Mod+B", category: "View" },
  { id: "toggleSettings", label: "Open settings", defaultKeys: "Mod+,", category: "View" },
  { id: "selectAll", label: "Select all files", defaultKeys: "Mod+A", category: "Selection" },
  { id: "deleteSelected", label: "Delete selection", defaultKeys: "Delete", category: "Editing" },
  { id: "favorite", label: "Toggle favorite", defaultKeys: "F", category: "Editing" },
  { id: "rename", label: "Rename", defaultKeys: "F2", category: "Editing" },
  { id: "duplicate", label: "Duplicate", defaultKeys: "Mod+D", category: "Editing" },
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
