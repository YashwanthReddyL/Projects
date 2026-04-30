import { useState } from 'react'
import { useLeaderboard } from '../../hooks/useAnalytics'
import { useSeasons } from '../../hooks/useMatch'
import { fmtAvg } from '../../api/client'
import Skeleton from '../../components/Skeleton'

const METRICS = [
  { id: 'runs',        label: 'Most runs',       fmt: (v: number) => v.toFixed(0) },
  { id: 'wickets',     label: 'Most wickets',    fmt: (v: number) => v.toFixed(0) },
  { id: 'sixes',       label: 'Most sixes',      fmt: (v: number) => v.toFixed(0) },
  { id: 'strike_rate', label: 'Best SR',         fmt: (v: number) => v.toFixed(2) },
  { id: 'average',     label: 'Best avg',        fmt: (v: number) => fmtAvg(v) },
  { id: 'economy',     label: 'Best economy',    fmt: (v: number) => v.toFixed(2) },
]
const MEDAL = ['🥇', '🥈', '🥉']

export default function LeaderboardView() {
  const [metric,  setMetric]  = useState('runs')
  const [season,  setSeason]  = useState('')
  const [minInn,  setMinInn]  = useState(10)

  const { data: seasons } = useSeasons()
  const { data, isLoading, error } = useLeaderboard(metric, season || undefined, minInn)
  const metaObj = METRICS.find(m => m.id === metric)!
  const maxVal  = data?.[0]?.value ?? 1

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {METRICS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetric(m.id)}
              style={{
                padding: '6px 13px', borderRadius: 20, fontSize: 13,
                border: '1px solid', cursor: 'pointer',
                background: metric === m.id ? '#1D9E75' : '#fff',
                borderColor: metric === m.id ? '#1D9E75' : '#ddd',
                color: metric === m.id ? '#fff' : '#333',
                fontWeight: metric === m.id ? 500 : 400,
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <select
          value={season}
          onChange={e => setSeason(e.target.value)}
          style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
        >
          <option value=''>All seasons</option>
          {seasons?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <label style={{ fontSize: 13, color: '#666', display: 'flex', alignItems: 'center', gap: 6 }}>
          Min innings:
          <select
            value={minInn}
            onChange={e => setMinInn(Number(e.target.value))}
            style={{ padding: '5px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}
          >
            {[5, 10, 15, 20].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
      </div>

      {isLoading && <Skeleton.Table rows={10} cols={5} />}
      {error && <div style={{ color: '#A32D2D', padding: 12, background: '#FCEBEB', borderRadius: 8, fontSize: 13 }}>{String(error)}</div>}

      {data && !isLoading && data.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 14 }}>
          No players meet the minimum innings criteria for this filter.
        </div>
      )}

      {data && !isLoading && data.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, minWidth: 400 }}>
              <thead>
                <tr style={{ background: '#f8f8f8', borderBottom: '1px solid #eee' }}>
                  {['#', 'Player', metaObj.label, 'Matches', 'Detail'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: h === '#' || h === 'Player' ? 'left' : 'right', fontWeight: 500, fontSize: 12, color: '#555' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((row, i) => (
                  <tr key={row.player} style={{ borderBottom: '1px solid #f5f5f5' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#fafafa')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                  >
                    <td style={{ padding: '10px 14px', fontSize: 15, width: 36 }}>
                      {i < 3 ? MEDAL[i] : <span style={{ color: '#bbb', fontSize: 13 }}>{row.rank}</span>}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 500 }}>{row.player}</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', width: 100 }}>
                      <div style={{ fontWeight: 700, color: '#1D9E75', fontSize: 15 }}>
                        {metaObj.fmt(row.value)}
                      </div>
                      <div style={{ height: 3, background: '#f0f0f0', borderRadius: 2, marginTop: 3 }}>
                        <div style={{ height: '100%', width: `${(row.value / maxVal) * 100}%`, background: '#1D9E75', borderRadius: 2 }} />
                      </div>
                    </td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#888', width: 80 }}>{row.matches}</td>
                    <td style={{ padding: '10px 14px', color: '#aaa', fontSize: 12 }}>{row.secondary}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
