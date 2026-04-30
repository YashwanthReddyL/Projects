interface Props {
  label: string
  value: string | number
  sub?: string
  accent?: boolean
}

export default function StatBar({ label, value, sub, accent }: Props) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '10px 0', borderBottom: '1px solid #f0f0f0',
    }}>
      <span style={{ fontSize: '13px', color: '#666' }}>{label}</span>
      <div style={{ textAlign: 'right' }}>
        <span style={{
          fontSize: '16px', fontWeight: 500,
          color: accent ? '#1D9E75' : '#1a1a1a',
        }}>
          {value}
        </span>
        {sub && <div style={{ fontSize: '11px', color: '#aaa', marginTop: '1px' }}>{sub}</div>}
      </div>
    </div>
  )
}
