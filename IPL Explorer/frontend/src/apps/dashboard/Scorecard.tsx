import { Scorecard as ScorecardType, BatsmanLine, BowlerLine } from '../../api/client'

interface Props { scorecard: ScorecardType }

function InningsCard({
  title, badge, batting, bowling, total, wickets,
}: {
  title: string
  badge?: string
  batting: BatsmanLine[]
  bowling: BowlerLine[]
  total: number
  wickets: number
}) {
  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #eee' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <div style={{ fontWeight: 500, fontSize: '15px' }}>
          {title} — {total}/{wickets}
        </div>
        {badge && (
          <span style={{
            fontSize: '11px', fontWeight: 500, padding: '2px 8px',
            borderRadius: '10px', background: '#FAEEDA', color: '#633806',
          }}>
            {badge}
          </span>
        )}
      </div>

      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f8f8f8' }}>
            {['Batsman', 'R', 'B', '4s', '6s', 'SR', 'Dismissal'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {batting.map((b, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={tdStyle}>{b.batsman}</td>
              <td style={{ ...tdStyle, fontWeight: 500 }}>{b.runs}</td>
              <td style={tdStyle}>{b.balls}</td>
              <td style={tdStyle}>{b.fours}</td>
              <td style={tdStyle}>{b.sixes}</td>
              <td style={tdStyle}>{b.strike_rate}</td>
              <td style={{ ...tdStyle, color: '#888', fontSize: '12px' }}>{b.dismissal}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '16px', fontWeight: 500, fontSize: '14px', marginBottom: '8px' }}>
        Bowling
      </div>
      <table style={tableStyle}>
        <thead>
          <tr style={{ background: '#f8f8f8' }}>
            {['Bowler', 'O', 'R', 'W', 'Eco', 'Wd', 'NB'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bowling.map((b, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f0f0' }}>
              <td style={tdStyle}>{b.bowler}</td>
              <td style={tdStyle}>{b.overs}</td>
              <td style={tdStyle}>{b.runs}</td>
              <td style={{ ...tdStyle, fontWeight: 500 }}>{b.wickets}</td>
              <td style={tdStyle}>{b.economy}</td>
              <td style={tdStyle}>{b.wides}</td>
              <td style={tdStyle}>{b.no_balls}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Scorecard({ scorecard: sc }: Props) {
  const { match } = sc
  const soCount = sc.super_overs.length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #eee' }}>
        <div style={{ fontSize: '18px', fontWeight: 500, marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          {match.team1} vs {match.team2}
          {soCount > 0 && (
            <span style={{
              fontSize: '12px', fontWeight: 500,
              padding: '3px 9px', borderRadius: '10px',
              background: '#FAEEDA', color: '#633806',
            }}>
              {soCount >= 4 ? 'Double super over' : 'Super over'}
            </span>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#666' }}>
          {match.date} · {match.venue}, {match.city}
        </div>
        <div style={{ fontSize: '13px', color: '#666', marginTop: '4px' }}>
          Toss: {match.toss_winner} elected to {match.toss_decision}
        </div>
        <div style={{ marginTop: '8px', fontWeight: 500, color: '#1D9E75' }}>
          {match.winner} won by {match.win_by_runs > 0
            ? `${match.win_by_runs} runs`
            : `${match.win_by_wickets} wickets`}
        </div>
        <div style={{ fontSize: '12px', color: '#888', marginTop: '4px' }}>
          Player of match: {match.player_of_match}
        </div>
      </div>

      <InningsCard
        title={match.team1}
        batting={sc.innings1_batting}
        bowling={sc.innings1_bowling}
        total={sc.innings1_total}
        wickets={sc.innings1_wickets}
      />
      <InningsCard
        title={match.team2}
        batting={sc.innings2_batting}
        bowling={sc.innings2_bowling}
        total={sc.innings2_total}
        wickets={sc.innings2_wickets}
      />

      {sc.super_overs.length > 0 && (
        <>
          <div style={{ fontSize: '13px', fontWeight: 500, color: '#854F0B', paddingTop: '4px' }}>
            Super over{sc.super_overs.length > 2 ? 's' : ''}
          </div>
          {sc.super_overs.map((so, i) => {
            const soRound = Math.floor(i / 2) + 1
            const badge = sc.super_overs.length > 2 ? `Super over ${soRound}` : 'Super over'
            return (
              <InningsCard
                key={so.innings}
                title={so.team}
                badge={badge}
                batting={so.batting}
                bowling={so.bowling}
                total={so.total}
                wickets={so.wickets}
              />
            )
          })}
        </>
      )}
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%', borderCollapse: 'collapse', fontSize: '13px',
}
const thStyle: React.CSSProperties = {
  padding: '6px 10px', textAlign: 'left',
  fontWeight: 500, fontSize: '12px', color: '#555',
}
const tdStyle: React.CSSProperties = {
  padding: '7px 10px', textAlign: 'left',
}
