"use client"

export function SkeletonCard() {
  return (
    <div className="w-[288px] animate-pulse">
      <div className="h-[224px] rounded-2xl bg-white/[0.04] border border-white/[0.06] overflow-hidden" />
      <div className="-mt-12 mx-2 rounded-2xl bg-white/[0.06] border border-white/[0.06] p-4 space-y-2">
        <div className="h-4 rounded bg-white/[0.08] w-3/4" />
        <div className="h-3 rounded bg-white/[0.06] w-1/2" />
      </div>
    </div>
  )
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
