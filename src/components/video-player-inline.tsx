"use client"

import { Play, Pause, Volume2, VolumeX } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import {
  getCurrentPlayingFile,
  setPlayingFile,
  subscribeToPlayState,
} from "@/lib/play-state-manager"

export function VideoPlayerInline({ url, fileId }: { url: string; fileId: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const onTime = () => setTime(v.currentTime)
    const onMeta = () => setDuration(v.duration)
    v.addEventListener("timeupdate", onTime)
    v.addEventListener("loadedmetadata", onMeta)
    return () => {
      v.removeEventListener("timeupdate", onTime)
      v.removeEventListener("loadedmetadata", onMeta)
    }
  }, [])

  // Single-file-playing invariant: pause when another file claims playback.
  useEffect(() => {
    return subscribeToPlayState((id) => {
      if (id !== fileId && ref.current && !ref.current.paused) {
        ref.current.pause()
        setPlaying(false)
      }
    })
  }, [fileId])

  // Release the global slot when this player unmounts while still active.
  useEffect(() => {
    return () => {
      if (getCurrentPlayingFile() === fileId) {
        setPlayingFile(null)
      }
    }
  }, [fileId])

  const start = () => {
    if (!ref.current) return
    void ref.current.play()
    setPlayingFile(fileId)
    setPlaying(true)
  }

  const stop = () => {
    if (!ref.current) return
    ref.current.pause()
    if (getCurrentPlayingFile() === fileId) setPlayingFile(null)
    setPlaying(false)
  }

  const toggle = () => {
    if (!ref.current) return
    if (ref.current.paused) start()
    else stop()
  }

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00"
    const m = Math.floor(s / 60)
    const r = Math.floor(s % 60)
    return `${m}:${String(r).padStart(2, "0")}`
  }

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-black/60 rounded-lg overflow-hidden">
      <video
        ref={ref}
        src={url}
        className="max-w-full max-h-full"
        onClick={toggle}
        onPlay={() => {
          setPlayingFile(fileId)
          setPlaying(true)
        }}
        onPause={() => {
          if (getCurrentPlayingFile() === fileId) setPlayingFile(null)
          setPlaying(false)
        }}
        onEnded={() => {
          if (getCurrentPlayingFile() === fileId) setPlayingFile(null)
          setPlaying(false)
        }}
      />
      <div className="absolute bottom-0 inset-x-0 px-4 py-3 bg-gradient-to-t from-black/80 to-transparent flex items-center gap-2">
        <button
          onClick={toggle}
          className="size-9 flex items-center justify-center rounded-full bg-white text-black hover:bg-white/90"
        >
          {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
        </button>
        <span className="text-[11px] text-white/70 font-mono">{fmt(time)}</span>
        <input
          type="range"
          min={0}
          max={duration || 1}
          step={0.1}
          value={time}
          onChange={(e) => {
            if (ref.current) {
              ref.current.currentTime = Number(e.target.value)
              setTime(Number(e.target.value))
            }
          }}
          className="flex-1 accent-white"
        />
        <span className="text-[11px] text-white/70 font-mono">{fmt(duration)}</span>
        <button
          onClick={() => {
            if (!ref.current) return
            ref.current.muted = !ref.current.muted
            setMuted(ref.current.muted)
          }}
          className="size-7 flex items-center justify-center rounded text-white/70 hover:text-white"
        >
          {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
        </button>
      </div>
    </div>
  )
}
