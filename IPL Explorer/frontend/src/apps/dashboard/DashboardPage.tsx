import { useState } from 'react'
import { useScorecard, useOverSummary, usePartnerships } from '../../hooks/useMatch'
import RunsChart       from './RunsChart'
import WicketsTimeline from './WicketsTimeline'
import PhaseSplitView  from './PhaseSplitView'
import PartnershipView from './PartnershipView'
import Scorecard       from './Scorecard'
import MatchPicker     from '../../components/MatchPicker'
import Skeleton        from '../../components/Skeleton'

type SubTab = 'charts' | 'scorecard' | 'phases' | 'partnerships'

export default function DashboardPage() {
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [subTab, setSubTab] = useState<SubTab>('charts')
  const [inn, setInn]       = useState(1)

  const { data: scorecard, isLoading: scLoading, error: scError } = useScorecard(selectedMatchId)
  const { data: overs }        = useOverSummary(selectedMatchId)
  const { data: partnerships } = usePartnerships(selectedMatchId, inn)

  function handleSelect(id: string) {
    setSelectedMatchId(id)
    setSubTab('charts')
    setInn(1)
  }

  return (
    <div style={{ padding: '0 16px 40px' }}>
      <MatchPicker onSelect={handleSelect} selectedMatchId={selectedMatchId} />

      {/* Empty state */}
      {!selectedMatchId && (
        <div style={{ textAlign: 'center', padding: '56px 0 32px', color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#888', marginBottom: 6 }}>Select a match to begin</div>
          <div style={{ fontSize: 13, color: '#bbb' }}>Filter by season and team, or search by name</div>
        </div>
      )}

      {/* Loading skeleton */}
      {scLoading && selectedMatchId && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Skeleton height={80} radius={12} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <Skeleton.Chart height={220} />
            <Skeleton.Chart height={220} />
          </div>
          <Skeleton.Table rows={8} cols={6} />
        </div>
      )}

      {/* Error */}
      {scError && (
        <div style={{ padding: 14, background: '#FCEBEB', color: '#A32D2D', borderRadius: 10, fontSize: 13 }}>
          {String(scError)}
        </div>
      )}

      {/* Match content */}
      {scorecard && !scLoading && (
        <>
          {/* Match result summary banner */}
          <MatchSummaryBanner scorecard={scorecard} />

          {/* Sub-navigation */}
          <div style={{
            display: 'flex', gap: 2, marginBottom: 16,
            borderBottom: '1px solid #eee', overflowX: 'auto',
          }}>
            {(['charts', 'scorecard', 'phases', 'partnerships'] as SubTab[]).map(t => (
              <button
                key={t}
                onClick={() => setSubTab(t)}
                style={{
                  padding: '9px 16px', border: 'none', background: 'none',
                  cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap',
                  fontWeight: subTab === t ? 500 : 400,
                  color: subTab === t ? '#1D9E75' : '#666',
                  borderBottom: subTab === t ? '2px solid #1D9E75' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Charts tab */}
          {subTab === 'charts' && overs && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
              <RunsChart overs={overs} team1={scorecard.match.team1} team2={scorecard.match.team2} />
              <WicketsTimeline overs={overs} team1={scorecard.match.team1} team2={scorecard.match.team2} />
            </div>
          )}

          {/* Scorecard tab */}
          {subTab === 'scorecard' && <Scorecard scorecard={scorecard} />}

          {/* Phases tab */}
          {subTab === 'phases' && (
            <PhaseSplitView
              splits={scorecard.phase_splits}
              team1={scorecard.match.team1}
              team2={scorecard.match.team2}
            />
          )}

          {/* Partnerships tab */}
          {subTab === 'partnerships' && (
            <div>
              <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
                {[1, 2].map(i => (
                  <button
                    key={i}
                    onClick={() => setInn(i)}
                    style={{
                      padding: '7px 16px', borderRadius: 8,
                      border: '1px solid', cursor: 'pointer', fontSize: 13,
                      background: inn === i ? '#1D9E75' : '#fff',
                      borderColor: inn === i ? '#1D9E75' : '#ddd',
                      color: inn === i ? '#fff' : '#333',
                    }}
                  >
                    {i === 1 ? scorecard.match.team1 : scorecard.match.team2}
                  </button>
                ))}
              </div>
              {partnerships
                ? <PartnershipView partnerships={partnerships} />
                : <Skeleton.Card rows={5} />
              }
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ── Match summary banner ───────────────────────────────────────────────────────
function MatchSummaryBanner({ scorecard }: { scorecard: any }) {
  const m = scorecard.match
  const won    = m.winner
  const margin = m.win_by_runs > 0
    ? `by ${m.win_by_runs} runs`
    : m.win_by_wickets > 0
    ? `by ${m.win_by_wickets} wickets`
    : 'by tie'

  const t1Total = scorecard.innings1_total
  const t2Total = scorecard.innings2_total
  const t1Wkts  = scorecard.innings1_wickets
  const t2Wkts  = scorecard.innings2_wickets

  return (
    <div style={{
      background: '#fff', border: '1px solid #eee', borderRadius: 12,
      padding: '14px 20px', marginBottom: 16,
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', flexWrap: 'wrap', gap: 12,
    }}>
      {/* Team 1 score */}
      <div style={{ textAlign: 'center', minWidth: 110 }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: '#888',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
        }}>
          {m.team1}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
          {t1Total}
          <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/{t1Wkts}</span>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>20.0 overs</div>
      </div>

      {/* Result */}
      <div style={{ textAlign: 'center', flex: 1, minWidth: 140 }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: '#1D9E75',
          marginBottom: 2,
        }}>
          {won} won
        </div>
        <div style={{ fontSize: 12, color: '#888' }}>{margin}</div>
        <div style={{ fontSize: 11, color: '#bbb', marginTop: 4 }}>
          {m.venue} · {m.date}
        </div>
      </div>

      {/* Team 2 score */}
      <div style={{ textAlign: 'center', minWidth: 110 }}>
        <div style={{
          fontSize: 12, fontWeight: 500, color: '#888',
          textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2,
        }}>
          {m.team2}
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>
          {t2Total}
          <span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/{t2Wkts}</span>
        </div>
        <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>
          {scorecard.innings2_wickets < 10 ? 'target chased' : 'all out'}
        </div>
      </div>
    </div>
  )
}
