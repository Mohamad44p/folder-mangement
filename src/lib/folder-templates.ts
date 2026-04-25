import type { TranslationKey } from "./i18n-dict"

export interface FolderTemplate {
  id: string
  name: string
  nameKey: TranslationKey
  icon: string
  description: string
  descKey: TranslationKey
  color?: string
  rootColor?: string
  rootIcon?: string
  subfolders: {
    name: string
    nameKey: TranslationKey
    icon?: string
    description?: string
    descKey?: TranslationKey
  }[]
}

export const FOLDER_TEMPLATES: FolderTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    nameKey: "tpl.blank.name",
    icon: "📁",
    description: "An empty folder, no structure.",
    descKey: "tpl.blank.desc",
    rootIcon: "📁",
    subfolders: [],
  },
  {
    id: "project",
    name: "Project",
    nameKey: "tpl.project.name",
    icon: "📋",
    description: "Briefs, drafts, and final deliverables.",
    descKey: "tpl.project.desc",
    rootIcon: "📋",
    rootColor: "#0c4a6e",
    subfolders: [
      { name: "Briefs", nameKey: "tpl.project.briefs", icon: "📋", description: "Source material and requirements.", descKey: "tpl.project.briefsDesc" },
      { name: "Drafts", nameKey: "tpl.project.drafts", icon: "✏️", description: "Work in progress.", descKey: "tpl.project.draftsDesc" },
      { name: "Final", nameKey: "tpl.project.final", icon: "✨", description: "Approved deliverables.", descKey: "tpl.project.finalDesc" },
      { name: "References", nameKey: "tpl.project.references", icon: "🔖", description: "Inspiration and reference files.", descKey: "tpl.project.referencesDesc" },
    ],
  },
  {
    id: "client",
    name: "Client",
    nameKey: "tpl.client.name",
    icon: "🤝",
    description: "Discovery, deliverables, communications.",
    descKey: "tpl.client.desc",
    rootIcon: "🤝",
    rootColor: "#4c1d95",
    subfolders: [
      { name: "Discovery", nameKey: "tpl.client.discovery", icon: "🔍", description: "Notes from initial calls.", descKey: "tpl.client.discoveryDesc" },
      { name: "Deliverables", nameKey: "tpl.client.deliverables", icon: "📦", description: "Files shared with the client.", descKey: "tpl.client.deliverablesDesc" },
      { name: "Comms", nameKey: "tpl.client.comms", icon: "📨", description: "Meeting recordings, emails.", descKey: "tpl.client.commsDesc" },
      { name: "Invoices", nameKey: "tpl.client.invoices", icon: "🧾", description: "Billing and contracts.", descKey: "tpl.client.invoicesDesc" },
    ],
  },
  {
    id: "trip",
    name: "Trip",
    nameKey: "tpl.trip.name",
    icon: "✈️",
    description: "Plans, itineraries, photos.",
    descKey: "tpl.trip.desc",
    rootIcon: "✈️",
    rootColor: "#064e3b",
    subfolders: [
      { name: "Plans", nameKey: "tpl.trip.plans", icon: "🗺️", description: "Itinerary and bookings.", descKey: "tpl.trip.plansDesc" },
      { name: "Photos", nameKey: "tpl.trip.photos", icon: "📸", description: "Trip photos.", descKey: "tpl.trip.photosDesc" },
      { name: "Receipts", nameKey: "tpl.trip.receipts", icon: "🧾", description: "Expenses.", descKey: "tpl.trip.receiptsDesc" },
    ],
  },
  {
    id: "brand",
    name: "Brand kit",
    nameKey: "tpl.brand.name",
    icon: "🎨",
    description: "Logos, palettes, type, guidelines.",
    descKey: "tpl.brand.desc",
    rootIcon: "🎨",
    rootColor: "#701a75",
    subfolders: [
      { name: "Logos", nameKey: "tpl.brand.logos", icon: "🏷️", descKey: "tpl.brand.logosDesc" },
      { name: "Palettes", nameKey: "tpl.brand.palettes", icon: "🎨", descKey: "tpl.brand.palettesDesc" },
      { name: "Type", nameKey: "tpl.brand.type", icon: "🔠", descKey: "tpl.brand.typeDesc" },
      { name: "Guidelines", nameKey: "tpl.brand.guidelines", icon: "📐", descKey: "tpl.brand.guidelinesDesc" },
    ],
  },
  {
    id: "shoot",
    name: "Photo shoot",
    nameKey: "tpl.shoot.name",
    icon: "📸",
    description: "Selects, raw, edited.",
    descKey: "tpl.shoot.desc",
    rootIcon: "📸",
    rootColor: "#7f1d1d",
    subfolders: [
      { name: "Raw", nameKey: "tpl.shoot.raw", icon: "📷", description: "Original captures.", descKey: "tpl.shoot.rawDesc" },
      { name: "Selects", nameKey: "tpl.shoot.selects", icon: "👀", description: "Best of the bunch.", descKey: "tpl.shoot.selectsDesc" },
      { name: "Edited", nameKey: "tpl.shoot.edited", icon: "✨", description: "Post-processed finals.", descKey: "tpl.shoot.editedDesc" },
    ],
  },
]
