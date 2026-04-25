"use client"

import { useState, useMemo } from "react"
import type { Project } from "@/lib/data"
import type { ImagePosition } from "./types"
import { useT } from "@/contexts/i18n-context"
import { formatDateLocalized } from "@/lib/localize"

interface UseProjectStateProps {
  project: Project
  index: number
}

export function useProjectState({ project, index }: UseProjectStateProps) {
  const { t, lang } = useT()
  const [isHovered, setIsHovered] = useState(false)

  const fileCount = project.fileCount

  const imagePositions = useMemo<ImagePosition[]>(() => {
    const count = 5
    const positions: ImagePosition[] = []
    const totalSpread = 160
    const step = count > 1 ? totalSpread / (count - 1) : 0
    const startX = -totalSpread / 2

    for (let i = 0; i < count; i++) {
      const x = count > 1 ? startX + step * i : 0
      const normalizedPos = count > 1 ? (i / (count - 1)) * 2 - 1 : 0
      const rotate = normalizedPos * 10
      positions.push({ x, rotate })
    }
    return positions
  }, [])

  const formattedDate = useMemo(() => {
    if (project.createdAt) {
      const d = new Date(project.createdAt)
      if (!Number.isNaN(d.getTime())) return formatDateLocalized(d, t, lang)
    }
    const now = new Date()
    const hoursAgo = index * 24
    return formatDateLocalized(new Date(now.getTime() - hoursAgo * 3600_000), t, lang)
  }, [project.createdAt, index, t, lang])

  return {
    isHovered,
    setIsHovered,
    fileCount,
    formattedDate,
    imagePositions,
  }
}
