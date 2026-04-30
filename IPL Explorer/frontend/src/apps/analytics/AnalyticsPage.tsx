import { useState } from 'react'
import LeaderboardView from './LeaderboardView'
import H2HView from './H2HView'
import VenuesView from './VenuesView'

type SubTab = 'leaderboard' | 'h2h' | 'venues'

export default function AnalyticsPage() {
  const [tab, setTab] = useState<SubTab>('leaderboard')

  return (
    <div style={{ padding: '0 16px 40px' }}>
      <div style={{ display: 'flex', gap: '4px', borderBottom: '1px solid #eee', marginBottom: '20px' }}>
        {(['leaderboard', 'h2h', 'venues'] as SubTab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '12px 18px', border: 'none', background: 'none',
            cursor: 'pointer', fontSize: '14px',
            fontWeight: tab === t ? 500 : 400,
            color: tab === t ? '#1D9E75' : '#666',
            borderBottom: tab === t ? '2px solid #1D9E75' : '2px solid transparent',
            marginBottom: '-1px',
            textTransform: 'capitalize',
          }}>
            {t === 'h2h' ? 'Head-to-head' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'leaderboard' && <LeaderboardView />}
      {tab === 'h2h'         && <H2HView />}
      {tab === 'venues'      && <VenuesView />}
    </div>
  )
}
