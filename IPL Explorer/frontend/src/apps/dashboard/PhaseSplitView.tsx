import { PhaseSplit } from '../../api/client'

interface Props {
  splits: PhaseSplit[]
  team1: string
  team2: string
}

const PHASES = ['powerplay', 'middle', 'death']
const LABELS: Record<string, string> = { powerplay: 'Powerplay (1-6)', middle: 'Middle (7-15)', death: 'Death (16-20)' }
const COLORS: Record<string, string> = { powerplay: '#1D9E75', middle: '#378ADD', death: '#D85A30' }

export default function PhaseSplitView({ splits, team1, team2 }: Props) {
  const get = (phase: string, inn: number) =>
    splits.find(s => s.phase === `${phase}_inn${inn}`)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {[1, 2].map(inn => {
        const team = inn === 1 ? team1 : team2
        return (
          <div key={inn} style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
            <div style={{ fontWeight: 500, fontSize: '15px', marginBottom: '14px', color: '#333' }}>
              {team} — innings {inn}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {PHASES.map(phase => {
                const p = get(phase, inn)
                const maxRuns = Math.max(...PHASES.map(ph => get(ph, inn)?.runs ?? 0), 1)
                const barWidth = p ? Math.round((p.runs / maxRuns) * 100) : 0
                return (
                  <div key={phase} style={{ background: '#f8f8f8', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 500, color: COLORS[phase], marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {LABELS[phase]}
                    </div>
                    {p ? (
                      <>
                        <div style={{ fontSize: '24px', fontWeight: 600, color: '#1a1a1a', lineHeight: 1 }}>
                          {p.runs}<span style={{ fontSize: '14px', fontWeight: 400, color: '#666' }}>/{p.wickets}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: '#888', margin: '6px 0 10px' }}>
                          RR: {p.run_rate.toFixed(2)} · {p.balls} balls
                        </div>
                        <div style={{ height: '4px', background: '#e5e5e5', borderRadius: '2px' }}>
                          <div style={{ height: '100%', width: `${barWidth}%`, background: COLORS[phase], borderRadius: '2px', transition: 'width 0.4s' }} />
                        </div>
                      </>
                    ) : (
                      <div style={{ fontSize: '13px', color: '#bbb' }}>No data</div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
