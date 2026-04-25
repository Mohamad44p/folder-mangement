"use client"

import type { FileAnnotation } from "@/lib/data"
import { Square as SquareIcon, ArrowRight, Type, Circle as CircleIcon, Trash2, Save, Eye, EyeOff } from "lucide-react"
import { useEffect, useRef, useState } from "react"

const COLORS = ["#ffffff", "#fbbf24", "#fb7185", "#34d399", "#60a5fa", "#a78bfa"]

type Tool = "rect" | "arrow" | "text" | "circle" | null

export function AnnotationsCanvas({
  annotations,
  onChange,
  visible,
  onToggleVisible,
  width,
  height,
}: {
  annotations: FileAnnotation[]
  onChange: (a: FileAnnotation[]) => void
  visible: boolean
  onToggleVisible: (v: boolean) => void
  width: number
  height: number
}) {
  const [tool, setTool] = useState<Tool>(null)
  const [color, setColor] = useState(COLORS[0])
  const [drawing, setDrawing] = useState<FileAnnotation | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [textPrompt, setTextPrompt] = useState<{ x: number; y: number } | null>(null)
  const [textDraft, setTextDraft] = useState("")

  const toPercent = (e: React.PointerEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return {
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!tool) return
    e.stopPropagation()
    const p = toPercent(e)
    if (tool === "text") {
      setTextPrompt(p)
      setTextDraft("")
      return
    }
    const id = `a-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    setDrawing({
      id,
      kind: tool,
      x: p.x,
      y: p.y,
      w: 0,
      h: 0,
      x2: p.x,
      y2: p.y,
      color,
      createdAt: new Date().toISOString(),
    })
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing) return
    const p = toPercent(e)
    setDrawing((d) =>
      d ? { ...d, w: p.x - d.x, h: p.y - d.y, x2: p.x, y2: p.y } : d,
    )
  }

  const onPointerUp = () => {
    if (drawing) {
      const minSize = 1
      const sized = drawing.kind === "rect" || drawing.kind === "circle"
        ? Math.abs(drawing.w ?? 0) > minSize && Math.abs(drawing.h ?? 0) > minSize
        : Math.hypot((drawing.x2 ?? drawing.x) - drawing.x, (drawing.y2 ?? drawing.y) - drawing.y) > minSize
      if (sized) {
        const norm =
          drawing.kind === "rect" || drawing.kind === "circle"
            ? {
                ...drawing,
                x: Math.min(drawing.x, drawing.x + (drawing.w ?? 0)),
                y: Math.min(drawing.y, drawing.y + (drawing.h ?? 0)),
                w: Math.abs(drawing.w ?? 0),
                h: Math.abs(drawing.h ?? 0),
              }
            : drawing
        onChange([...annotations, norm])
      }
      setDrawing(null)
    }
  }

  const remove = (id: string) => onChange(annotations.filter((a) => a.id !== id))

  const renderAnn = (a: FileAnnotation, key?: string) => {
    if (a.kind === "rect") {
      return (
        <rect
          key={key ?? a.id}
          x={`${a.x}%`}
          y={`${a.y}%`}
          width={`${a.w ?? 0}%`}
          height={`${a.h ?? 0}%`}
          fill="none"
          stroke={a.color}
          strokeWidth={2}
          rx={3}
        />
      )
    }
    if (a.kind === "circle") {
      const r = (a.w ?? 0) / 2
      return (
        <ellipse
          key={key ?? a.id}
          cx={`${a.x + r}%`}
          cy={`${a.y + (a.h ?? 0) / 2}%`}
          rx={`${Math.abs(a.w ?? 0) / 2}%`}
          ry={`${Math.abs(a.h ?? 0) / 2}%`}
          fill="none"
          stroke={a.color}
          strokeWidth={2}
        />
      )
    }
    if (a.kind === "arrow") {
      return (
        <g key={key ?? a.id}>
          <line
            x1={`${a.x}%`}
            y1={`${a.y}%`}
            x2={`${a.x2 ?? a.x}%`}
            y2={`${a.y2 ?? a.y}%`}
            stroke={a.color}
            strokeWidth={2.5}
            markerEnd={`url(#arrowhead-${a.id})`}
          />
          <defs>
            <marker
              id={`arrowhead-${a.id}`}
              markerWidth="10"
              markerHeight="10"
              refX="8"
              refY="3"
              orient="auto"
            >
              <polygon points="0 0, 10 3, 0 6" fill={a.color} />
            </marker>
          </defs>
        </g>
      )
    }
    if (a.kind === "text") {
      return (
        <text
          key={key ?? a.id}
          x={`${a.x}%`}
          y={`${a.y}%`}
          fill={a.color}
          fontSize="14"
          fontWeight="600"
          style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.6)", strokeWidth: 2 }}
        >
          {a.text}
        </text>
      )
    }
    return null
  }

  return (
    <>
      {/* Toolbar */}
      <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1 bg-black/70 backdrop-blur-md border border-white/[0.08] rounded-full px-2 py-1.5">
        <button
          onClick={() => onToggleVisible(!visible)}
          className="size-7 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/[0.1]"
          title={visible ? "Hide annotations" : "Show annotations"}
        >
          {visible ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
        </button>
        <span className="w-px h-4 bg-white/10 mx-0.5" />
        {(["rect", "circle", "arrow", "text"] as const).map((t) => {
          const Icon = t === "rect" ? SquareIcon : t === "circle" ? CircleIcon : t === "arrow" ? ArrowRight : Type
          return (
            <button
              key={t}
              onClick={() => setTool(tool === t ? null : t)}
              className={`size-7 flex items-center justify-center rounded-full ${
                tool === t ? "bg-white/[0.15] text-white" : "text-white/60 hover:text-white hover:bg-white/[0.1]"
              }`}
              title={t}
            >
              <Icon className="size-3.5" />
            </button>
          )
        })}
        <span className="w-px h-4 bg-white/10 mx-0.5" />
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className={`size-5 rounded-full ${color === c ? "ring-2 ring-white" : ""}`}
            style={{ backgroundColor: c }}
            title={c}
          />
        ))}
        {annotations.length > 0 && (
          <>
            <span className="w-px h-4 bg-white/10 mx-0.5" />
            <button
              onClick={() => onChange([])}
              className="px-2 h-7 rounded-full text-[11px] text-white/60 hover:text-red-400 hover:bg-red-500/10 flex items-center gap-1"
            >
              <Trash2 className="size-3" />
              Clear
            </button>
          </>
        )}
      </div>

      {visible && (
        <div
          ref={containerRef}
          className={`absolute inset-0 z-20 ${tool ? "cursor-crosshair" : "pointer-events-none"}`}
          onPointerDown={tool ? onPointerDown : undefined}
          onPointerMove={tool ? onPointerMove : undefined}
          onPointerUp={tool ? onPointerUp : undefined}
          onPointerLeave={tool ? onPointerUp : undefined}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="none">
            {annotations.map((a) => renderAnn(a))}
            {drawing && renderAnn(drawing, "drawing")}
          </svg>

          {textPrompt && (
            <div
              className="absolute z-40 bg-black/80 border border-white/[0.1] rounded-lg p-2 backdrop-blur-md pointer-events-auto"
              style={{ left: `${textPrompt.x}%`, top: `${textPrompt.y}%` }}
            >
              <input
                autoFocus
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder="Annotation text"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (textDraft.trim()) {
                      onChange([
                        ...annotations,
                        {
                          id: `a-${Date.now()}`,
                          kind: "text",
                          x: textPrompt.x,
                          y: textPrompt.y,
                          color,
                          text: textDraft.trim(),
                          createdAt: new Date().toISOString(),
                        },
                      ])
                    }
                    setTextPrompt(null)
                    setTool(null)
                  }
                  if (e.key === "Escape") {
                    setTextPrompt(null)
                  }
                }}
                className="bg-transparent text-[12px] text-white focus:outline-none px-1"
              />
            </div>
          )}
        </div>
      )}
    </>
  )
}
