"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import { FOLDER_TEMPLATES } from "@/lib/folder-templates"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { toast } from "sonner"

export function FolderTemplatePicker() {
  const { templatePickerOpen, setTemplatePickerOpen, createFromTemplate, openFolder } = useFolders()
  const { t } = useT()

  return (
    <AnimatePresence>
      {templatePickerOpen && (
        <motion.div
          className="fixed inset-0 z-[260] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={() => setTemplatePickerOpen(false)}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 4 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative w-full max-w-[640px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-white/[0.06] flex items-center">
              <div>
                <h3 className="text-[15px] font-semibold text-white">{t("tpl.title")}</h3>
                <p className="text-[12px] text-white/40">{t("tpl.subtitle")}</p>
              </div>
              <button
                onClick={() => setTemplatePickerOpen(false)}
                className="ms-auto size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08]"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {FOLDER_TEMPLATES.map((tpl) => {
                const tplName = t(tpl.nameKey)
                const tplDesc = t(tpl.descKey)
                return (
                  <button
                    key={tpl.id}
                    onClick={() => {
                      const id = createFromTemplate(
                        null,
                        {
                          title: tpl.id === "blank" ? t("card.newFolder") : tplName,
                          icon: tpl.rootIcon,
                          color: tpl.rootColor,
                        },
                        tpl.subfolders.map((sf) => ({
                          title: t(sf.nameKey),
                          icon: sf.icon,
                          description: sf.descKey ? t(sf.descKey) : sf.description,
                        })),
                      )
                      setTemplatePickerOpen(false)
                      toast.success(t("toast.fromTemplate", { name: tplName }))
                      setTimeout(() => openFolder(id), 200)
                    }}
                    className="text-left p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:border-white/[0.14] hover:bg-white/[0.05] transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="size-9 rounded-lg flex items-center justify-center text-lg"
                        style={{
                          backgroundColor: tpl.rootColor ?? "rgba(255,255,255,0.06)",
                        }}
                      >
                        {tpl.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-white">{tplName}</div>
                        <div className="text-[11px] text-white/40 truncate">{tplDesc}</div>
                      </div>
                    </div>
                    {tpl.subfolders.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {tpl.subfolders.map((sf) => (
                          <span
                            key={sf.name}
                            className="px-2 py-0.5 rounded-full bg-white/[0.04] text-[10px] text-white/60 flex items-center gap-1"
                          >
                            <span>{sf.icon}</span>
                            {t(sf.nameKey)}
                          </span>
                        ))}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
