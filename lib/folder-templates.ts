export interface FolderTemplate {
  id: string
  name: string
  icon: string
  description: string
  color?: string
  rootColor?: string
  rootIcon?: string
  subfolders: { name: string; icon?: string; description?: string }[]
}

export const FOLDER_TEMPLATES: FolderTemplate[] = [
  {
    id: "blank",
    name: "Blank",
    icon: "📁",
    description: "An empty folder, no structure.",
    rootIcon: "📁",
    subfolders: [],
  },
  {
    id: "project",
    name: "Project",
    icon: "📋",
    description: "Briefs, drafts, and final deliverables.",
    rootIcon: "📋",
    rootColor: "#0c4a6e",
    subfolders: [
      { name: "Briefs", icon: "📋", description: "Source material and requirements." },
      { name: "Drafts", icon: "✏️", description: "Work in progress." },
      { name: "Final", icon: "✨", description: "Approved deliverables." },
      { name: "References", icon: "🔖", description: "Inspiration and reference files." },
    ],
  },
  {
    id: "client",
    name: "Client",
    icon: "🤝",
    description: "Discovery, deliverables, communications.",
    rootIcon: "🤝",
    rootColor: "#4c1d95",
    subfolders: [
      { name: "Discovery", icon: "🔍", description: "Notes from initial calls." },
      { name: "Deliverables", icon: "📦", description: "Files shared with the client." },
      { name: "Comms", icon: "📨", description: "Meeting recordings, emails." },
      { name: "Invoices", icon: "🧾", description: "Billing and contracts." },
    ],
  },
  {
    id: "trip",
    name: "Trip",
    icon: "✈️",
    description: "Plans, itineraries, photos.",
    rootIcon: "✈️",
    rootColor: "#064e3b",
    subfolders: [
      { name: "Plans", icon: "🗺️", description: "Itinerary and bookings." },
      { name: "Photos", icon: "📸", description: "Trip photos." },
      { name: "Receipts", icon: "🧾", description: "Expenses." },
    ],
  },
  {
    id: "brand",
    name: "Brand kit",
    icon: "🎨",
    description: "Logos, palettes, type, guidelines.",
    rootIcon: "🎨",
    rootColor: "#701a75",
    subfolders: [
      { name: "Logos", icon: "🏷️" },
      { name: "Palettes", icon: "🎨" },
      { name: "Type", icon: "🔠" },
      { name: "Guidelines", icon: "📐" },
    ],
  },
  {
    id: "shoot",
    name: "Photo shoot",
    icon: "📸",
    description: "Selects, raw, edited.",
    rootIcon: "📸",
    rootColor: "#7f1d1d",
    subfolders: [
      { name: "Raw", icon: "📷", description: "Original captures." },
      { name: "Selects", icon: "👀", description: "Best of the bunch." },
      { name: "Edited", icon: "✨", description: "Post-processed finals." },
    ],
  },
]
