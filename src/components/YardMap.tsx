import type { MapPoint } from '../guideShared'

const YARD_POINTS: { id: MapPoint; label: string; x: number; y: number }[] = [
  { id: 'road', label: '赴仓路', x: 48, y: 200 },
  { id: 'gate', label: '闸口', x: 150, y: 200 },
  { id: 'yard', label: '场内', x: 250, y: 200 },
  { id: 'dock', label: '道口', x: 360, y: 120 },
  { id: 'counter', label: '提货窗', x: 360, y: 260 },
  { id: 'exit', label: '出口', x: 150, y: 80 },
  { id: 'dispatch', label: '调度', x: 48, y: 80 },
]

const WAREHOUSE_POINTS: { id: MapPoint; label: string; x: number; y: number }[] = [
  { id: 'dispatch', label: '调度', x: 48, y: 80 },
  { id: 'aisle', label: '库位', x: 160, y: 180 },
  { id: 'check', label: '复核', x: 280, y: 180 },
  { id: 'dock', label: '月台', x: 380, y: 120 },
]

export function YardMap({
  current,
  next,
  layout = 'yard',
  points,
}: {
  current: MapPoint
  next?: MapPoint
  layout?: 'yard' | 'warehouse'
  points?: { id: MapPoint; label: string; x: number; y: number }[]
}) {
  const pts = points ?? (layout === 'warehouse' ? WAREHOUSE_POINTS : YARD_POINTS)

  return (
    <div className="yard-map" aria-label="作业示意地图">
      <svg viewBox="0 0 420 320" role="img">
        <rect x="0" y="0" width="420" height="320" rx="16" className="ym-bg" />

        {layout === 'warehouse' ? (
          <>
            <path d="M40 80 H160 V180 H280 V180 H380 V120" className="ym-road" />
            <rect x="120" y="140" width="80" height="80" rx="8" className="ym-block" />
            <text x="160" y="185" textAnchor="middle" className="ym-block-label">
              货架区
            </text>
            <rect x="240" y="140" width="80" height="80" rx="8" className="ym-block gate" />
            <text x="280" y="185" textAnchor="middle" className="ym-block-label">
              复核
            </text>
            <rect x="340" y="40" width="60" height="100" rx="8" className="ym-block" />
            <text x="370" y="95" textAnchor="middle" className="ym-block-label">
              月台
            </text>
          </>
        ) : (
          <>
            <path d="M20 200 H280" className="ym-road" />
            <path d="M280 200 V120 H400" className="ym-road" />
            <path d="M280 200 V260 H400" className="ym-road" />
            <path d="M150 200 V80" className="ym-road faint" />
            <rect x="300" y="40" width="100" height="50" rx="8" className="ym-block" />
            <text x="350" y="70" textAnchor="middle" className="ym-block-label">
              月台区
            </text>
            <rect x="300" y="230" width="100" height="50" rx="8" className="ym-block" />
            <text x="350" y="260" textAnchor="middle" className="ym-block-label">
              服务台
            </text>
            <rect x="120" y="160" width="60" height="80" rx="8" className="ym-block gate" />
            <text x="150" y="205" textAnchor="middle" className="ym-block-label">
              闸
            </text>
          </>
        )}

        {pts.map((p) => {
          const isCurrent = p.id === current
          const isNext = p.id === next
          return (
            <g key={p.id} transform={`translate(${p.x}, ${p.y})`}>
              <circle
                r={isCurrent ? 16 : 11}
                className={`ym-dot ${isCurrent ? 'current' : ''} ${isNext ? 'next' : ''}`}
              />
              <text y={32} textAnchor="middle" className={`ym-label ${isCurrent ? 'on' : ''}`}>
                {p.label}
              </text>
            </g>
          )
        })}

        {next && current !== next && (
          <text x="210" y="300" textAnchor="middle" className="ym-hint">
            实心＝当前位置 · 描边＝下一步
          </text>
        )}
      </svg>
    </div>
  )
}
