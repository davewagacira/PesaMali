interface SkeletonProps {
  width?: string | number
  height?: string | number
  circle?: boolean
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({
  width = '100%',
  height = 16,
  circle = false,
  className = '',
  style = {},
}: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        background: 'var(--card-2)',
        borderRadius: circle ? '50%' : 12,
        width,
        height,
        ...style,
      }}
    />
  )
}

export function SkeletonText({
  lines = 3,
  className = '',
  style = {},
}: {
  lines?: number
  className?: string
  style?: React.CSSProperties
}) {
  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 8, ...style }}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} height={14} width={i === lines - 1 ? '85%' : '100%'} />
      ))}
    </div>
  )
}
