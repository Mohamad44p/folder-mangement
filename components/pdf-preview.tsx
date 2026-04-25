"use client"

export function PdfPreview({ url, name }: { url: string; name: string }) {
  return (
    <div className="w-full h-full bg-black/40 rounded-lg overflow-hidden border border-white/[0.06] flex flex-col">
      <div className="px-3 py-2 border-b border-white/[0.06] flex items-center gap-2 bg-white/[0.02]">
        <span className="text-[12px] text-white/70 truncate">{name}</span>
      </div>
      <iframe src={url} title={name} className="flex-1 w-full bg-white" />
    </div>
  )
}
