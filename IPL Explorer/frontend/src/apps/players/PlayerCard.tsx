import { Bar } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, Legend } from 'chart.js'
import { PlayerStats, fmtAvg } from '../../api/client'
import StatBar from './StatBar'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Props { stats: PlayerStats }

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px',
}
const sectionLabel: React.CSSProperties = {
  fontSize: '11px', fontWeight: 600, color: '#999',
  textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px',
}
const pill: (color: string, bg: string) => React.CSSProperties = (color, bg) => ({
  display: 'inline-block', fontSize: '11px', fontWeight: 500,
  padding: '3px 9px', borderRadius: '10px',
  background: bg, color, marginRight: '6px', marginBottom: '4px',
})

export default function PlayerCard({ stats }: Props) {
  const { batting: b, bowling: bw, fielding: f } = stats
  const hasBatting  = b.innings > 0
  const hasBowling  = bw.innings > 0
  const hasFielding = f.total > 0

  const seasons     = stats.season_batting.map(s => s.season)
  const seasonRuns  = stats.season_batting.map(s => s.runs)
  const bowlSeasons = stats.season_bowling.map(s => s.season)
  const seasonWkts  = stats.season_bowling.map(s => s.wickets)

  // Determine player role label
  const role = (() => {
    if (hasBatting && hasBowling) return 'All-rounder'
    if (hasBatting && !hasBowling) return 'Batter'
    if (!hasBatting && hasBowling) return 'Bowler'
    if (hasFielding) return 'Fielder / No batting or bowling recorded'
    return 'No performance data'
  })()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
        color: '#fff', borderRadius: '12px', padding: '20px 24px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ fontSize: '22px', fontWeight: 600, letterSpacing: '-0.02em' }}>{stats.player}</div>
            <div style={{ fontSize: '12px', opacity: 0.75, marginTop: '3px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {role}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            {hasBatting && (
              <>
                <div style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>{b.runs.toLocaleString()}</div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>career runs</div>
              </>
            )}
            {!hasBatting && hasBowling && (
              <>
                <div style={{ fontSize: '32px', fontWeight: 700, lineHeight: 1 }}>{bw.wickets}</div>
                <div style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px' }}>career wickets</div>
              </>
            )}
          </div>
        </div>

        {/* Match involvement pills */}
        <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          <span style={pill('#085041', 'rgba(255,255,255,0.2)')}>
            {stats.matches_in_squad > 0 ? stats.matches_in_squad : stats.matches_played} matches in squad
          </span>
          {hasBatting && (
            <span style={pill('#085041', 'rgba(255,255,255,0.15)')}>
              {stats.matches_batted} batted
            </span>
          )}
          {hasBowling && (
            <span style={pill('#085041', 'rgba(255,255,255,0.15)')}>
              {stats.matches_bowled} bowled
            </span>
          )}
          {stats.dnb_count > 0 && (
            <span style={pill('#633806', 'rgba(250,238,218,0.9)')}>
              {stats.dnb_count} DNB
            </span>
          )}
          {stats.player_of_match_count > 0 && (
            <span style={pill('#085041', 'rgba(255,255,255,0.2)')}>
              {stats.player_of_match_count}× Player of Match
            </span>
          )}
        </div>
      </div>

      {/* ── No data notice ─────────────────────────────────────────────────── */}
      {!hasBatting && !hasBowling && !hasFielding && (
        <div style={{ ...card, color: '#888', fontSize: '13px', textAlign: 'center', padding: '24px' }}>
          This player was part of the squad but has no batting, bowling, or fielding data recorded.
          They may have been 12th man or a substitute.
        </div>
      )}

      {/* ── Stats grid ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: hasBatting && hasBowling ? '1fr 1fr' : '1fr', gap: '14px' }}>

        {/* Batting card */}
        {hasBatting && (
          <div style={card}>
            <div style={sectionLabel}>Batting</div>
            <StatBar label="Innings"       value={b.innings} />
            <StatBar label="Runs"          value={b.runs.toLocaleString()} />
            <StatBar label="Not outs"      value={b.not_outs}
              sub={b.not_outs > 0 ? `${((b.not_outs/b.innings)*100).toFixed(0)}% of innings` : undefined} />
            <StatBar label="Average"       value={fmtAvg(b.average)} accent
              sub={b.average < 0 ? 'never dismissed' : undefined} />
            <StatBar label="Strike rate"   value={b.strike_rate.toFixed(2)} accent />
            <StatBar label="Highest score" value={b.highest_score} />
            <StatBar label="50s / 100s"    value={`${b.fifties} / ${b.hundreds}`} />
            <StatBar label="4s / 6s"       value={`${b.fours} / ${b.sixes}`} />
            {b.duck_outs > 0 && (
              <StatBar label="Ducks" value={b.duck_outs} />
            )}
          </div>
        )}

        {/* Bowling card */}
        {hasBowling && (
          <div style={card}>
            <div style={sectionLabel}>Bowling</div>
            <StatBar label="Overs"         value={bw.overs} />
            <StatBar label="Wickets"       value={bw.wickets} accent />
            <StatBar label="Economy"       value={bw.economy.toFixed(2)} accent />
            <StatBar label="Average"       value={fmtAvg(bw.average)}
              sub={bw.average < 0 ? 'no wickets' : undefined} />
            <StatBar label="Best figures"  value={bw.best_figures} />
            <StatBar label="Dot balls"     value={bw.dot_balls}
              sub={bw.balls_bowled > 0 ? `${((bw.dot_balls/bw.balls_bowled)*100).toFixed(0)}% dots` : undefined} />
            <StatBar label="Wides"         value={bw.wides} />
            <StatBar label="No-balls"      value={bw.no_balls} />
          </div>
        )}
      </div>

      {/* ── Fielding card ───────────────────────────────────────────────────── */}
      {hasFielding && (
        <div style={card}>
          <div style={sectionLabel}>Fielding</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[
              { label: 'Total',      value: f.total },
              { label: 'Catches',    value: f.catches },
              { label: 'Run-outs',   value: f.run_outs },
              { label: 'Stumpings',  value: f.stumpings },
            ].map(s => (
              <div key={s.label} style={{ background: '#f8f8f8', borderRadius: '8px', padding: '12px', textAlign: 'center' }}>
                <div style={{ fontSize: '22px', fontWeight: 600, color: s.label === 'Total' ? '#1D9E75' : '#1a1a1a' }}>
                  {s.value}
                </div>
                <div style={{ fontSize: '11px', color: '#888', marginTop: '3px' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── DNB notice ─────────────────────────────────────────────────────── */}
      {stats.dnb_count > 0 && (
        <div style={{
          ...card,
          background: '#FAEEDA', border: '1px solid #FAC775',
          fontSize: '13px', color: '#633806',
          display: 'flex', gap: '10px', alignItems: 'center',
        }}>
          <div style={{ fontSize: '18px' }}>ℹ</div>
          <div>
            <strong>{stats.dnb_count} Did Not Bat</strong> — selected in the playing XI but did not
            get a chance to bat in {stats.dnb_count === 1 ? 'this match' : `${stats.dnb_count} matches`}.
            {hasBowling && ' Bowling and fielding contributions are still counted.'}
          </div>
        </div>
      )}

      {/* ── Season runs chart ───────────────────────────────────────────────── */}
      {seasons.length > 1 && (
        <div style={card}>
          <div style={sectionLabel}>Runs by season</div>
          <Bar
            data={{
              labels: seasons,
              datasets: [{
                label: 'Runs',
                data: seasonRuns,
                backgroundColor: seasons.map((_, i) =>
                  i === seasonRuns.indexOf(Math.max(...seasonRuns))
                    ? 'rgba(29,158,117,1)' : 'rgba(29,158,117,0.55)'
                ),
                borderRadius: 4,
              }],
            }}
            options={{
              responsive: true, maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item: any) => {
                      const sd = stats.season_batting.find(s => s.season === item.label)
                      if (!sd) return `${item.raw} runs`
                      return [
                        `${sd.runs} runs`,
                        `Avg: ${fmtAvg(sd.average)} · SR: ${sd.strike_rate.toFixed(1)}`,
                        `50s: ${sd.fifties} · 100s: ${sd.hundreds}`,
                      ]
                    },
                  },
                },
              },
              scales: {
                y: { beginAtZero: true, grid: { color: '#f5f5f5' } },
                x: { grid: { display: false } },
              },
            }}
          />
        </div>
      )}

      {/* ── Season wickets chart ─────────────────────────────────────────────── */}
      {bowlSeasons.length > 1 && (
        <div style={card}>
          <div style={sectionLabel}>Wickets by season</div>
          <Bar
            data={{
              labels: bowlSeasons,
              datasets: [{
                label: 'Wickets',
                data: seasonWkts,
                backgroundColor: bowlSeasons.map((_, i) =>
                  i === seasonWkts.indexOf(Math.max(...seasonWkts))
                    ? 'rgba(216,90,48,1)' : 'rgba(216,90,48,0.55)'
                ),
                borderRadius: 4,
              }],
            }}
            options={{
              responsive: true, maintainAspectRatio: true,
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    label: (item: any) => {
                      const sd = stats.season_bowling.find(s => s.season === item.label)
                      if (!sd) return `${item.raw} wickets`
                      return [
                        `${sd.wickets} wickets`,
                        `Economy: ${sd.economy.toFixed(2)} · Avg: ${fmtAvg(sd.average)}`,
                        `Best: ${sd.best_figures}`,
                      ]
                    },
                  },
                },
              },
              scales: {
                y: { beginAtZero: true, ticks: { stepSize: 1 }, grid: { color: '#f5f5f5' } },
                x: { grid: { display: false } },
              },
            }}
          />
        </div>
      )}

      {/* ── Season breakdown tables ──────────────────────────────────────────── */}
      {stats.season_batting.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>Season breakdown — batting</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  {['Season','M','Inn','Runs','Avg','SR','50s','100s','HS'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h==='Season'?'left':'right', fontWeight: 500, fontSize: '11px', color: '#666' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.season_batting.map(s => (
                  <tr key={s.season} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 500 }}>{s.season}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>{s.matches}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>{s.innings}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600 }}>{s.runs}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#1D9E75', fontWeight: 500 }}>{fmtAvg(s.average)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{s.strike_rate.toFixed(1)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{s.fifties}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{s.hundreds}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{s.highest_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.season_bowling.length > 0 && (
        <div style={card}>
          <div style={sectionLabel}>Season breakdown — bowling</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  {['Season','M','Inn','Wkts','Eco','Avg','Dots','Best'].map(h => (
                    <th key={h} style={{ padding: '7px 10px', textAlign: h==='Season'?'left':'right', fontWeight: 500, fontSize: '11px', color: '#666' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.season_bowling.map(s => (
                  <tr key={s.season} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '7px 10px', fontWeight: 500 }}>{s.season}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>{s.matches}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>{s.innings}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 600, color: '#D85A30' }}>{s.wickets}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#1D9E75', fontWeight: 500 }}>{s.economy.toFixed(2)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{fmtAvg(s.average)}</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right', color: '#888' }}>—</td>
                    <td style={{ padding: '7px 10px', textAlign: 'right' }}>{s.best_figures}</td>
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
