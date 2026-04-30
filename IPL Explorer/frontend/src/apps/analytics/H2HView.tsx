import { useState } from 'react'
import { useH2HPlayers, useH2HTeams } from '../../hooks/useAnalytics'
import { useTeams } from '../../hooks/useMatch'
import { usePlayerSearch } from '../../hooks/usePlayerStats'
import { useDebounce } from '../../hooks/useDebounce'
import Skeleton from '../../components/Skeleton'

type Mode = 'team' | 'player'

export default function H2HView() {
  const [mode, setMode] = useState<Mode>('team')

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['team', 'player'] as Mode[]).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              padding: '8px 20px', borderRadius: 20, border: '1px solid',
              cursor: 'pointer', fontSize: 13, fontWeight: mode === m ? 500 : 400,
              background: mode === m ? '#1D9E75' : '#fff',
              borderColor: mode === m ? '#1D9E75' : '#ddd',
              color: mode === m ? '#fff' : '#333',
            }}
          >
            {m === 'team' ? 'Team vs team' : 'Batsman vs bowler'}
          </button>
        ))}
      </div>
      {mode === 'team'   && <TeamH2H />}
      {mode === 'player' && <PlayerH2H />}
    </div>
  )
}

function TeamH2H() {
  const { data: teams } = useTeams()
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const { data, isLoading } = useH2HTeams(t1 || null, t2 || null)

  const sel: React.CSSProperties = {
    padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd',
    fontSize: 13, minWidth: 200, background: '#fff',
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <select value={t1} onChange={e => setT1(e.target.value)} style={sel}>
          <option value=''>Select team 1</option>
          {teams?.filter(t => t !== t2).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <span style={{ color: '#aaa', fontWeight: 500 }}>vs</span>
        <select value={t2} onChange={e => setT2(e.target.value)} style={sel}>
          <option value=''>Select team 2</option>
          {teams?.filter(t => t !== t1).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {isLoading && <Skeleton height={200} radius={12} />}

      {!isLoading && t1 && t2 && !data && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa', fontSize: 14 }}>
          These teams have never played each other in the dataset.
        </div>
      )}

      {data && data.matches === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa', fontSize: 14 }}>
          No matches found between {t1} and {t2}.
        </div>
      )}

      {data && data.matches > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Win % bar */}
          <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{data.team1}</div>
              <div style={{ color: '#aaa', fontSize: 12 }}>{data.matches} matches</div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{data.team2}</div>
            </div>
            <div style={{ display: 'flex', height: 30, borderRadius: 6, overflow: 'hidden' }}>
              <div style={{ width: `${(data.team1_wins / data.matches) * 100}%`, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                {data.team1_wins > 0 && data.team1_wins}
              </div>
              {data.no_result > 0 && (
                <div style={{ width: `${(data.no_result / data.matches) * 100}%`, background: '#e0e0e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#888' }}>
                  NR
                </div>
              )}
              <div style={{ flex: 1, background: '#D85A30', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 500 }}>
                {data.team2_wins > 0 && data.team2_wins}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 12, color: '#888' }}>
              <span>{data.matches > 0 ? ((data.team1_wins / data.matches) * 100).toFixed(0) : 0}% win rate</span>
              <span>{data.matches > 0 ? ((data.team2_wins / data.matches) * 100).toFixed(0) : 0}% win rate</span>
            </div>
          </div>

          {/* Last 5 */}
          {data.last_5.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '16px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>
                Last {data.last_5.length} meetings
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {data.last_5.map((winner, i) => (
                  <div
                    key={i}
                    style={{
                      padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                      background: winner === data.team1 ? '#E1F5EE' : winner === data.team2 ? '#FAECE7' : '#f0f0f0',
                      color: winner === data.team1 ? '#0F6E56' : winner === data.team2 ? '#712B13' : '#888',
                    }}
                  >
                    {winner === 'No result' ? 'NR' : winner}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PlayerH2H() {
  const [batQ, setBatQ]         = useState('')
  const [bowlQ, setBowlQ]       = useState('')
  const [batsman, setBatsman]   = useState<string | null>(null)
  const [bowler, setBowler]     = useState<string | null>(null)

  const dBatQ  = useDebounce(batQ, 280)
  const dBowlQ = useDebounce(bowlQ, 280)
  const { data: batResults }  = usePlayerSearch(dBatQ)
  const { data: bowlResults } = usePlayerSearch(dBowlQ)
  const { data, isLoading }   = useH2HPlayers(batsman, bowler)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
        <PlayerSearchBox
          label='Batsman'
          query={batQ} setQuery={q => { setBatQ(q); setBatsman(null) }}
          results={batResults} selected={batsman}
          onSelect={n => { setBatsman(n); setBatQ(n) }}
        />
        <PlayerSearchBox
          label='Bowler'
          query={bowlQ} setQuery={q => { setBowlQ(q); setBowler(null) }}
          results={bowlResults} selected={bowler}
          onSelect={n => { setBowler(n); setBowlQ(n) }}
        />
      </div>

      {isLoading && <Skeleton height={100} radius={12} />}

      {!isLoading && batsman && bowler && data?.balls === 0 && (
        <div style={{ textAlign: 'center', padding: '32px 0', color: '#aaa', fontSize: 14 }}>
          {batsman} and {bowler} have never faced each other in the dataset.
        </div>
      )}

      {data && data.balls > 0 && !isLoading && (
        <div style={{
          background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 20,
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: 16,
        }}>
          {[
            { label: 'Balls faced',  value: String(data.balls) },
            { label: 'Runs scored',  value: String(data.runs),                  accent: true },
            { label: 'Dismissals',   value: String(data.dismissals) },
            { label: 'Strike rate',  value: data.strike_rate.toFixed(1),        accent: true },
            { label: 'Dot ball %',   value: `${data.dot_ball_pct.toFixed(1)}%` },
          ].map(s => (
            <div key={s.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: s.accent ? '#1D9E75' : '#1a1a1a' }}>{s.value}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function PlayerSearchBox({ label, query, setQuery, results, selected, onSelect }: {
  label: string; query: string; setQuery: (q: string) => void
  results?: string[]; selected: string | null; onSelect: (n: string) => void
}) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#999', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ position: 'relative' }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder={`Search ${label.toLowerCase()}…`}
          style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, boxSizing: 'border-box' }}
        />
        {results && results.length > 0 && !selected && query.length >= 2 && (
          <div style={{
            position: 'absolute', top: '100%', left: 0, right: 0,
            background: '#fff', border: '1px solid #ddd', borderRadius: 8,
            marginTop: 4, zIndex: 20, boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            maxHeight: 180, overflowY: 'auto',
          }}>
            {results.map(r => (
              <div
                key={r}
                onClick={() => onSelect(r)}
                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f5f5f5' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f5f9f7')}
                onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
              >
                {r}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
