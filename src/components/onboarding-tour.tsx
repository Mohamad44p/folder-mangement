"use client"

import { useFolders } from "@/contexts/folder-context"
import { useT } from "@/contexts/i18n-context"
import type { TranslationKey } from "@/lib/i18n-dict"
import { AnimatePresence, motion } from "framer-motion"
import { Sparkles, X, ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

interface Step {
  titleKey: TranslationKey
  bodyKey: TranslationKey
  icon: string
}

const STEPS: Step[] = [
  { titleKey: "onboarding.welcomeTitle", bodyKey: "onboarding.welcomeBody", icon: "✨" },
  { titleKey: "onboarding.openTitle", bodyKey: "onboarding.openBody", icon: "📂" },
  { titleKey: "onboarding.searchTitle", bodyKey: "onboarding.searchBody", icon: "🔍" },
  { titleKey: "onboarding.tplTitle", bodyKey: "onboarding.tplBody", icon: "📋" },
  { titleKey: "onboarding.title5", bodyKey: "onboarding.body5", icon: "🚀" },
]

export function OnboardingTour() {
  const { onboardingComplete, setOnboardingComplete } = useFolders()
  const { t } = useT()
  const [step, setStep] = useState(0)
  const open = !onboardingComplete

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[450] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={() => setOnboardingComplete(true)}
          />
          <motion.div
            className="relative w-full max-w-[440px] rounded-2xl bg-[#161616] border border-white/[0.08] shadow-2xl overflow-hidden"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setOnboardingComplete(true)}
              className="absolute top-3 right-3 size-8 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/[0.08] z-10"
            >
              <X className="size-4" />
            </button>
            <div className="p-8 text-center">
              <motion.div
                key={step}
                initial={{ scale: 0.9, opacity: 0, y: 8 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="size-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-white/[0.08] flex items-center justify-center mx-auto mb-4 text-3xl"
              >
                {STEPS[step].icon}
              </motion.div>
              <motion.div
                key={`t-${step}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.05 }}
              >
                <h3 className="text-[17px] font-semibold text-white mb-2">{t(STEPS[step].titleKey)}</h3>
                <p className="text-[13px] text-white/60 leading-relaxed">{t(STEPS[step].bodyKey)}</p>
              </motion.div>
            </div>
            <div className="px-6 pb-6 flex items-center gap-2">
              <button
                onClick={() => setOnboardingComplete(true)}
                className="text-[12px] text-white/40 hover:text-white"
              >
                {t("onboarding.skip")}
              </button>
              <div className="flex-1 flex justify-center gap-1.5">
                {STEPS.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setStep(i)}
                    className={`h-1.5 rounded-full transition-all ${
                      i === step ? "w-6 bg-white" : "w-1.5 bg-white/20 hover:bg-white/40"
                    }`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                  className="size-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.08] disabled:opacity-30"
                >
                  <ChevronLeft className="size-4" />
                </button>
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
                    className="px-3 h-8 rounded-full bg-white text-black text-[12px] font-medium hover:bg-white/90 flex items-center gap-1"
                  >
                    {t("onboarding.next")}
                    <ChevronRight className="size-3" />
                  </button>
                ) : (
                  <button
                    onClick={() => setOnboardingComplete(true)}
                    className="px-3 h-8 rounded-full bg-white text-black text-[12px] font-medium hover:bg-white/90 flex items-center gap-1"
                  >
                    <Sparkles className="size-3" />
                    {t("onboarding.start")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
