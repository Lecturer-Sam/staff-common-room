const ringColor = (p) => (p >= 75 ? '#16a34a' : p >= 50 ? '#d97706' : '#dc2626')

export default function ScoreRing({ percent, size = 140 }) {
  const stroke = 12
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={ringColor(percent)} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c - (c * percent) / 100} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold text-slate-900">{percent}%</span>
        <span className="text-xs text-slate-400">score</span>
      </div>
    </div>
  )
}