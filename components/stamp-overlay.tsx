"use client"

/**
 * StampOverlay — renders a postage-stamp style perforated border around an element.
 * Usage: wrap your image/card content with this component.
 */
export function StampBorder({
  className = "",
  color = "white",
  holeCount = 14,
}: {
  className?: string
  color?: string
  holeCount?: number
}) {
  const holes = Array.from({ length: holeCount })
  const spacing = 100 / (holeCount + 1)

  return (
    <svg
      className={`absolute inset-0 w-full h-full pointer-events-none z-10 ${className}`}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {/* Top holes */}
      {holes.map((_, i) => (
        <circle
          key={`t-${i}`}
          cx={(i + 1) * spacing}
          cy={2.5}
          r={2.2}
          fill={color}
        />
      ))}
      {/* Bottom holes */}
      {holes.map((_, i) => (
        <circle
          key={`b-${i}`}
          cx={(i + 1) * spacing}
          cy={97.5}
          r={2.2}
          fill={color}
        />
      ))}
      {/* Left holes */}
      {holes.map((_, i) => (
        <circle
          key={`l-${i}`}
          cx={2.5}
          cy={(i + 1) * spacing}
          r={2.2}
          fill={color}
        />
      ))}
      {/* Right holes */}
      {holes.map((_, i) => (
        <circle
          key={`r-${i}`}
          cx={97.5}
          cy={(i + 1) * spacing}
          r={2.2}
          fill={color}
        />
      ))}
    </svg>
  )
}

/**
 * PassportStamp — renders a circular stamp badge overlay (for "VISITED" etc.)
 */
export function PassportStamp({
  text = "VISITED",
  color = "#c0392b",
  className = "",
}: {
  text?: string
  color?: string
  className?: string
}) {
  return (
    <div
      className={`pointer-events-none select-none ${className}`}
      style={{
        border: `3px solid ${color}`,
        borderRadius: "50%",
        padding: "6px 10px",
        color,
        fontFamily: "'Courier New', monospace",
        fontWeight: 700,
        fontSize: "0.65rem",
        letterSpacing: "0.15em",
        textTransform: "uppercase",
        opacity: 0.85,
        transform: "rotate(-18deg)",
        boxShadow: `0 0 0 1px ${color}40`,
      }}
    >
      {text}
    </div>
  )
}

/**
 * MagnetPin — small colorful circle pin to sit on top of magnets
 */
export function MagnetPin({ color = "#e74c3c" }: { color?: string }) {
  return (
    <div
      className="absolute -top-3 left-1/2 -translate-x-1/2 z-20"
      style={{
        width: 14,
        height: 14,
        borderRadius: "50%",
        background: color,
        boxShadow: `0 2px 6px rgba(0,0,0,0.4), inset 0 1px 2px rgba(255,255,255,0.5)`,
        border: "1.5px solid rgba(255,255,255,0.7)",
      }}
    />
  )
}
