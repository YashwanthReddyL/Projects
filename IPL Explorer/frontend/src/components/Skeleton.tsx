/**
 * Skeleton.tsx
 * Pulse-animated placeholder blocks for loading states.
 * Usage: <Skeleton width="100%" height={20} />
 *        <Skeleton.Card rows={4} />
 *        <Skeleton.Table rows={10} cols={5} />
 */

interface SkeletonProps {
  width?: string | number
  height?: number
  radius?: number
  style?: React.CSSProperties
}

const pulse: React.CSSProperties = {
  background: 'linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)',
  backgroundSize: '200% 100%',
  animation: 'skeleton-pulse 1.4s ease-in-out infinite',
  borderRadius: 6,
}

// Inject keyframes once
if (typeof document !== 'undefined') {
  const id = 'skeleton-keyframes'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `@keyframes skeleton-pulse {
      0%   { background-position: 200% 0 }
      100% { background-position: -200% 0 }
    }`
    document.head.appendChild(s)
  }
}

export default function Skeleton({ width = '100%', height = 16, radius = 6, style }: SkeletonProps) {
  return (
    <div style={{
      ...pulse,
      width,
      height,
      borderRadius: radius,
      flexShrink: 0,
      ...style,
    }} />
  )
}

// ── Composite skeletons ───────────────────────────────────────────────────────

Skeleton.Card = function SkeletonCard({ rows = 4 }: { rows?: number }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #eee', borderRadius: 12,
      padding: 16, display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <Skeleton height={14} width="40%" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Skeleton height={13} width={`${45 + (i % 3) * 10}%`} />
          <Skeleton height={13} width="20%" />
        </div>
      ))}
    </div>
  )
}

Skeleton.Table = function SkeletonTable({ rows = 8, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 14px', background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} height={12} width={`${100 / cols}%`} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid #f5f5f5' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} height={13} width={`${100 / cols}%`} style={{ opacity: 1 - r * 0.05 }} />
          ))}
        </div>
      ))}
    </div>
  )
}

Skeleton.Chart = function SkeletonChart({ height = 220 }: { height?: number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
      <Skeleton height={14} width="35%" style={{ marginBottom: 16 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height }}>
        {Array.from({ length: 20 }).map((_, i) => (
          <Skeleton
            key={i}
            height={Math.round(30 + Math.abs(Math.sin(i * 0.8)) * (height - 40))}
            width="100%"
            radius={3}
          />
        ))}
      </div>
    </div>
  )
}

Skeleton.PlayerHeader = function SkeletonPlayerHeader() {
  return (
    <div style={{
      background: '#e8e8e8', borderRadius: 12, padding: '20px 24px',
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Skeleton height={22} width={160} style={{ background: '#d0d0d0' }} />
        <Skeleton height={13} width={220} style={{ background: '#d8d8d8' }} />
        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
          {[80, 70, 60].map((w, i) => (
            <Skeleton key={i} height={22} width={w} radius={10} style={{ background: '#d0d0d0' }} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <Skeleton height={32} width={80} style={{ background: '#d0d0d0' }} />
        <Skeleton height={12} width={60} style={{ background: '#d8d8d8' }} />
      </div>
    </div>
  )
}

Skeleton.MatchPicker = function SkeletonMatchPicker() {
  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '16px 20px', marginBottom: 16 }}>
      <Skeleton height={11} width={100} style={{ marginBottom: 12 }} />
      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
        <Skeleton height={34} width={120} radius={8} />
        <Skeleton height={34} width={160} radius={8} />
        <Skeleton height={34} style={{ flex: 1 }} radius={8} />
      </div>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ padding: '10px 14px', borderBottom: '1px solid #f5f5f5', display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Skeleton height={13} width={`${180 + (i % 3) * 30}px`} />
              <Skeleton height={11} width={120} />
            </div>
            <Skeleton height={13} width={70} />
          </div>
        ))}
      </div>
    </div>
  )
}
