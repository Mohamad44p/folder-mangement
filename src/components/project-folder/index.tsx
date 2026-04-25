"use client"

import type React from "react"

import type { ProjectFolderProps } from "./types"
import { useProjectState } from "./hooks"
import { FailedProject } from "./failed-project"
import { DefaultProject } from "./default-project"
import { useState } from "react"

export function ProjectFolder({
  project,
  index,
  onRemove,
  onClick,
  onRename,
}: ProjectFolderProps & {
  onRemove?: () => void
  onClick?: () => void
  onCancel?: () => void
  onRename?: (newTitle: string) => void
}) {
  const [isShaking, setIsShaking] = useState(false)

  const handleRename = (newTitle: string) => {
    onRename?.(newTitle)
  }

  const state = useProjectState({ project, index })

  const handleClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-menu]")) return
    if (project.isFailed) return

    setIsShaking(true)
    setTimeout(() => setIsShaking(false), 500)
    onClick?.()
  }

  if (project.isFailed) {
    return (
      <FailedProject
        project={project}
        isHovered={state.isHovered}
        setIsHovered={state.setIsHovered}
        onRemove={onRemove}
      />
    )
  }

  return (
    <div
      onClick={handleClick}
      className={`relative ${isShaking ? "animate-shake" : ""}`}
      style={{ 
        transformOrigin: "center center",
        zIndex: isShaking ? 100 : "auto",
      }}
    >
      <DefaultProject
        project={project}
        isHovered={state.isHovered}
        setIsHovered={state.setIsHovered}
        isGenerating={false}
        generationComplete={true}
        progress={100}
        sparklesFading={false}
        showImages={true}
        showGeneratingFooter={false}
        imagePositions={state.imagePositions}
        fileCount={state.fileCount}
        remainingEta={""}
        formattedDate={state.formattedDate}
        onRemove={onRemove}
        onCancel={() => {}}
        onRename={handleRename}
      />
    </div>
  )
}
