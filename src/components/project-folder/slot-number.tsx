"use client"

import { useState, useEffect } from "react"
import { useT } from "@/contexts/i18n-context"
import { localizeNumber } from "@/lib/localize"

interface SlotNumberProps {
  value: number
  isSpinning: boolean
}

export function SlotNumber({ value, isSpinning }: SlotNumberProps) {
  const { lang } = useT()
  const [displayValue, setDisplayValue] = useState(value)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isSpinning && value !== displayValue) {
      setIsAnimating(true)
      const diff = value - displayValue
      const steps = 5
      const stepValue = diff / steps
      let current = displayValue
      let step = 0

      const counter = setInterval(() => {
        step++
        current += stepValue
        setDisplayValue(Math.round(current))

        if (step >= steps) {
          clearInterval(counter)
          setDisplayValue(value)
          setTimeout(() => setIsAnimating(false), 50)
        }
      }, 40)

      return () => clearInterval(counter)
    }
  }, [isSpinning, value, displayValue])

  return (
    <span
      className="inline-block text-[13px] font-medium text-white/70 tabular-nums"
      style={{
        transition: "transform 150ms ease-out",
        transform: isAnimating ? "translateY(-1px)" : "translateY(0)",
      }}
    >
      {localizeNumber(displayValue, lang)}
    </span>
  )
}
