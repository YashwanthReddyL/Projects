import { useState, useMemo } from 'react'
import { useSeasons, useTeams, useMatches } from '../hooks/useMatch'
import { Match } from '../api/client'

interface Props {
  onSelect: (matchId: string) => void
  selectedMatchId: string | null
}

const card: React.CSSProperties = {
  background: '#fff', border: '1px solid #eee',
  borderRadius: '12px', padding: '16px 20px', marginBottom: '16px',
}
const sel: React.CSSProperties = {
  padding: '8px 10px', borderRadius: '8px', border: '1px solid #ddd',
  fontSize: '13px', background: '#fff', color: '#333',
}
const badge: React.CSSProperties = {
  display: 'inline-block', fontSize: '11px', fontWeight: 500,
  padding: '2px 8px', borderRadius: '10px',
  background: '#E1F5EE', color: '#0F6E56', marginLeft: '6px',
}

export default function MatchPicker({ onSelect, selectedMatchId }: Props) {
  const [season, setSeason] = useState('')
  const [team, setTeam]     = useState('')
  const [search, setSearch] = useState('')

  const { data: seasons } = useSeasons()
  const { data: teams }   = useTeams()
  const { data: matches, isLoading } = useMatches({
    season: season || undefined,
    team:   team   || undefined,
    limit:  500,
  })

  const filtered = useMemo(() => {
    if (!matches) return []
    if (!search.trim()) return matches
    const q = search.toLowerCase()
    return matches.filter(m =>
      m.team1.toLowerCase().includes(q) ||
      m.team2.toLowerCase().includes(q) ||
      m.venue.toLowerCase().includes(q) ||
      m.date.includes(q)
    )
  }, [matches, search])

  const selected = matches?.find(m => m.match_id === selectedMatchId)

  return (
    <div style={card}>
      <div style={{ fontSize: '13px', fontWeight: 500, color: '#888', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Select match
      </div>

      {/* Filter row */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '12px' }}>
        <select value={season} onChange={e => { setSeason(e.target.value); setTeam('') }} style={sel}>
          <option value=''>All seasons</option>
          {seasons?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={team} onChange={e => setTeam(e.target.value)} style={sel}>
          <option value=''>All teams</option>
          {teams?.map(t => <option key={t} value={t}>{t}</option>)}
        </select>

        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search team, venue, date...'
          style={{ ...sel, flex: 1, minWidth: '180px' }}
        />

        {(season || team || search) && (
          <button
            onClick={() => { setSeason(''); setTeam(''); setSearch('') }}
            style={{ ...sel, cursor: 'pointer', color: '#e24b4a', borderColor: '#f0b5b5' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Match list */}
      {isLoading && (
        <div style={{ color: '#aaa', fontSize: '13px', padding: '8px 0' }}>Loading matches...</div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ color: '#aaa', fontSize: '13px', padding: '8px 0' }}>No matches found</div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ maxHeight: '260px', overflowY: 'auto', borderRadius: '8px', border: '1px solid #eee' }}>
          {filtered.map((m, i) => (
            <MatchRow
              key={m.match_id}
              match={m}
              isSelected={m.match_id === selectedMatchId}
              isLast={i === filtered.length - 1}
              onClick={() => onSelect(m.match_id)}
            />
          ))}
        </div>
      )}

      {/* Selected match summary */}
      {selected && (
        <div style={{ marginTop: '12px', padding: '10px 14px', background: '#E1F5EE', borderRadius: '8px', fontSize: '13px', color: '#085041' }}>
          <span style={{ fontWeight: 500 }}>{selected.team1} vs {selected.team2}</span>
          <span style={badge}>{selected.season}</span>
          <span style={{ marginLeft: '8px', color: '#0F6E56' }}>· {selected.venue}</span>
          <span style={{ marginLeft: '8px', color: '#0F6E56' }}>· {selected.winner} won</span>
        </div>
      )}

      {!isLoading && filtered.length > 0 && (
        <div style={{ marginTop: '8px', fontSize: '12px', color: '#aaa' }}>
          {filtered.length} match{filtered.length !== 1 ? 'es' : ''}
          {matches && filtered.length < matches.length ? ` (filtered from ${matches.length})` : ''}
        </div>
      )}
    </div>
  )
}

function MatchRow({ match: m, isSelected, isLast, onClick }: {
  match: Match; isSelected: boolean; isLast: boolean; onClick: () => void
}) {
  return (
    <div
      onClick={onClick}
      style={{
        padding: '10px 14px',
        cursor: 'pointer',
        borderBottom: isLast ? 'none' : '1px solid #f5f5f5',
        background: isSelected ? '#E1F5EE' : '#fff',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        transition: 'background 0.1s',
      }}
      onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9f9f9' }}
      onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = '#fff' }}
    >
      <div>
        <div style={{ fontSize: '13px', fontWeight: isSelected ? 500 : 400, color: isSelected ? '#085041' : '#333' }}>
          {m.team1} vs {m.team2}
        </div>
        <div style={{ fontSize: '11px', color: '#999', marginTop: '2px' }}>
          {m.venue} · {m.city}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: '12px' }}>
        <div style={{ fontSize: '11px', color: '#aaa' }}>{m.date}</div>
        <div style={{ fontSize: '11px', color: '#0F6E56', marginTop: '2px' }}>{m.winner} won</div>
      </div>
    </div>
  )
}
