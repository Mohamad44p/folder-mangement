// Helpers that resolve user-visible strings (folder titles, tags, dates,
// byte sizes) into the active language. The dictionary lives in
// `i18n-dict.ts`; everything that wants a translated string for *folder data*
// or *formatting* goes through here so we keep one source of truth.

import type { Project } from "./data"
import type { TranslationKey } from "./i18n-dict"

type T = (key: TranslationKey, vars?: Record<string, string | number>) => string

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

// Map seeded English tag values to dictionary keys so we can render the
// localized label while keeping the raw value (used as the filter id).
const TAG_KEY_MAP: Record<string, TranslationKey> = {
  travel: "tag.travel",
  lifestyle: "tag.lifestyle",
  italy: "tag.italy",
  tech: "tag.tech",
  trends: "tag.trends",
  gaming: "tag.gaming",
  social: "tag.social",
  growth: "tag.growth",
  creators: "tag.creators",
  documentary: "tag.documentary",
  cinematic: "tag.cinematic",
  history: "tag.history",
  tutorial: "tag.tutorial",
  creative: "tag.creative",
  education: "tag.education",
  ancient: "tag.ancient",
  civilizations: "tag.civilizations",
  medieval: "tag.medieval",
  europe: "tag.europe",
  modern: "tag.modern",
  "20th-century": "tag.20thCentury",
  egypt: "tag.egypt",
  rome: "tag.rome",
  youtube: "tag.youtube",
  hooks: "tag.hooks",
  tiktok: "tag.tiktok",
  shorts: "tag.shorts",
  instagram: "tag.instagram",
  reels: "tag.reels",
  console: "tag.console",
  aaa: "tag.aaa",
  pc: "tag.pc",
  indie: "tag.indie",
  mobile: "tag.mobile",
  touch: "tag.touch",
  food: "tag.food",
  cucina: "tag.cucina",
  architecture: "tag.architecture",
  fashion: "tag.fashion",
  milano: "tag.milano",
  beginner: "tag.beginner",
  intermediate: "tag.intermediate",
  advanced: "tag.advanced",
  "day-1": "tag.day1",
}

export function localizeTag(tag: string, t: T): string {
  const key = TAG_KEY_MAP[tag]
  return key ? t(key) : tag
}

/* ------------------------------------------------------------------ */
/* Folder titles & descriptions                                        */
/* ------------------------------------------------------------------ */

// English defaults that the app generates when the user creates a blank
// folder — these need to flip to Arabic too.
const DEFAULT_TITLE_MAP: Record<string, TranslationKey> = {
  "New Folder": "card.newFolder",
  "Untitled Folder": "card.untitled",
  "New Project": "card.newProject",
}

export function localizeTitle(project: Pick<Project, "id" | "title">, t: T): string {
  // Seeded folder ids carry a known translation key.
  const seeded = `seedTitle.${project.id}` as TranslationKey
  if (hasKey(seeded)) {
    const translated = t(seeded)
    if (translated && translated !== seeded) return translated
  }
  // English defaults from blank-folder creation.
  const def = DEFAULT_TITLE_MAP[project.title]
  if (def) return t(def)
  return project.title
}

export function localizeDescription(
  project: Pick<Project, "id" | "description">,
  t: T,
): string {
  const seeded = `seedDesc.${project.id}` as TranslationKey
  if (hasKey(seeded)) {
    const translated = t(seeded)
    if (translated && translated !== seeded) return translated
  }
  return project.description ?? ""
}

// Best-effort detection that a translation key exists. We import lazily to
// avoid a circular ref with i18n-context.
import { dictionaries } from "./i18n-dict"
function hasKey(k: string): k is TranslationKey {
  return Object.prototype.hasOwnProperty.call(dictionaries.en, k)
}

/* ------------------------------------------------------------------ */
/* Numerals                                                            */
/* ------------------------------------------------------------------ */

const ARABIC_INDIC = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"]

export function localizeNumber(n: number | string, lang: "en" | "ar"): string {
  const s = String(n)
  if (lang !== "ar") return s
  return s.replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)])
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function formatDateLocalized(date: Date, t: T, lang: "en" | "ar"): string {
  const monthKey = `month.${date.getMonth() + 1}` as TranslationKey
  const month = t(monthKey)
  const day = localizeNumber(date.getDate(), lang)
  const hours24 = date.getHours()
  const minutes = localizeNumber(date.getMinutes().toString().padStart(2, "0"), lang)
  const ampm = hours24 >= 12 ? t("time.pm") : t("time.am")
  const hours12 = localizeNumber(hours24 % 12 || 12, lang)
  if (lang === "ar") {
    return `${day} ${month} · ${hours12}:${minutes} ${ampm}`
  }
  return `${month} ${day} · ${hours12}:${minutes} ${ampm}`
}

/* ------------------------------------------------------------------ */
/* Bytes                                                               */
/* ------------------------------------------------------------------ */

export function formatBytesLocalized(n: number, t: T, lang: "en" | "ar"): string {
  if (n < 1024) {
    return `${localizeNumber(n, lang)} ${t("size.b")}`
  }
  if (n < 1024 * 1024) {
    return `${localizeNumber((n / 1024).toFixed(0), lang)} ${t("size.kb")}`
  }
  if (n < 1024 * 1024 * 1024) {
    return `${localizeNumber((n / (1024 * 1024)).toFixed(1), lang)} ${t("size.mb")}`
  }
  return `${localizeNumber((n / (1024 * 1024 * 1024)).toFixed(2), lang)} ${t("size.gb")}`
}
