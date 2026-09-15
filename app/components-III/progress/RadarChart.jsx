import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts'

export default function RadarChart({ data }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-slate-500">Subject balance</h2>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RechartsRadarChart data={data} cx="50%" cy="50%" outerRadius="75%">
            <PolarGrid />
            <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: '#64748b' }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
            <Radar dataKey="value" stroke="#4F46E5" fill="#4F46E5" fillOpacity={0.35} />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  )
}

