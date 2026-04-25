declare module "canvas-confetti" {
  export interface Options {
    particleCount?: number
    spread?: number
    origin?: { x: number; y: number }
    colors?: string[]
    startVelocity?: number
    gravity?: number
    scalar?: number
    drift?: number
    ticks?: number
    shapes?: ("circle" | "square" | "star")[]
    disableForReducedMotion?: boolean
    angle?: number
    decay?: number
  }
  function confetti(options?: Options): Promise<null> | null
  export default confetti
}
