import { PartnershipRecord } from '../../api/client'

interface Props { partnerships: PartnershipRecord[] }

function ordinal(n: number) {
  const s = ['th','st','nd','rd']
  const v = n % 100
  return n + (s[(v-20)%10] ?? s[v] ?? s[0])
}

export default function PartnershipView({ partnerships }: Props) {
  if (!partnerships.length) {
    return <div style={{ color: '#aaa', fontSize: '14px', textAlign: 'center', padding: '32px' }}>No partnership data</div>
  }

  const maxRuns = Math.max(...partnerships.map(p => p.runs), 1)

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: '12px', padding: '16px' }}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '14px' }}>
        Batting partnerships
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {partnerships.map((p, i) => {
          const sr = p.balls > 0 ? (p.runs / p.balls * 100).toFixed(1) : '0.0'
          const barW = Math.round((p.runs / maxRuns) * 100)
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '4px' }}>
                <div style={{ fontSize: '13px', color: '#333' }}>
                  <span style={{ fontSize: '11px', color: '#aaa', marginRight: '8px' }}>{ordinal(p.wicket)} wkt</span>
                  <span style={{ fontWeight: 500 }}>{p.batsman1}</span>
                  <span style={{ color: '#bbb', margin: '0 6px' }}>&amp;</span>
                  <span style={{ fontWeight: 500 }}>{p.batsman2}</span>
                </div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#1a1a1a', flexShrink: 0, marginLeft: '12px' }}>
                  {p.runs}
                  <span style={{ fontSize: '12px', fontWeight: 400, color: '#888', marginLeft: '4px' }}>
                    ({p.balls}b · SR {sr})
                  </span>
                </div>
              </div>
              <div style={{ height: '4px', background: '#f0f0f0', borderRadius: '2px' }}>
                <div style={{ height: '100%', width: `${barW}%`, background: '#1D9E75', borderRadius: '2px', transition: 'width 0.4s' }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
