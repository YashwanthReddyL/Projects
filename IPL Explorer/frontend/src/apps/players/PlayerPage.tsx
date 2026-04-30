import { useState } from 'react'
import { usePlayerSearch, usePlayerStats } from '../../hooks/usePlayerStats'
import { useSeasons } from '../../hooks/useMatch'
import { useDebounce } from '../../hooks/useDebounce'
import PlayerCard from './PlayerCard'
import Skeleton from '../../components/Skeleton'

const inp: React.CSSProperties = {
  width: '100%', padding: '10px 14px', borderRadius: 8,
  border: '1px solid #ddd', fontSize: 14, outline: 'none', boxSizing: 'border-box',
}
const sel: React.CSSProperties = {
  padding: '10px 12px', borderRadius: 8,
  border: '1px solid #ddd', fontSize: 14, background: '#fff',
}

export default function PlayerPage() {
  const [query, setQuery]     = useState('')
  const [selected, setSelected] = useState<string | null>(null)
  const [season, setSeason]   = useState('')

  const debouncedQuery = useDebounce(query, 280)
  const { data: suggestions } = usePlayerSearch(debouncedQuery)
  const { data: stats, isLoading, error } = usePlayerStats(selected, season || undefined)
  const { data: seasons } = useSeasons()

  function pick(name: string) {
    setSelected(name)
    setQuery(name)
  }

  const showDropdown = suggestions && suggestions.length > 0 && !selected && debouncedQuery.length >= 2

  return (
    <div style={{ padding: '0 16px 40px' }}>

      {/* Search controls */}
      <div style={{ padding: '16px 0 8px', display: 'flex', gap: 10, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSelected(null) }}
            placeholder='Search player… (e.g. "Kohli", "Bumrah", "virat kohli")'
            style={inp}
          />

          {/* Fuzzy-match dropdown */}
          {showDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 20,
              background: '#fff', border: '1px solid #ddd', borderRadius: 8,
              marginTop: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
              maxHeight: 240, overflowY: 'auto',
            }}>
              {suggestions.map(s => (
                <div
                  key={s}
                  onClick={() => pick(s)}
                  style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f5f5f5' }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f5f9f7')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#fff')}
                >
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>

        <select value={season} onChange={e => setSeason(e.target.value)} style={sel}>
          <option value=''>All seasons</option>
          {seasons?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        {selected && (
          <button
            onClick={() => { setSelected(null); setQuery(''); setSeason('') }}
            style={{ padding: '10px 14px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#666' }}
          >
            Clear
          </button>
        )}
      </div>

      {/* Empty state */}
      {!selected && !isLoading && (
        <div style={{ textAlign: 'center', padding: '56px 0 32px', color: '#aaa' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🏏</div>
          <div style={{ fontSize: 15, fontWeight: 500, color: '#888', marginBottom: 6 }}>Search for any IPL player</div>
          <div style={{ fontSize: 13, color: '#bbb' }}>
            Try "Rohit", "de Villiers", or "virat kohli" — fuzzy matching works
          </div>
        </div>
      )}

      {/* Skeleton while loading */}
      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Skeleton.PlayerHeader />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
            <Skeleton.Card rows={7} />
            <Skeleton.Card rows={7} />
          </div>
          <Skeleton.Chart height={200} />
          <Skeleton.Table rows={6} cols={8} />
        </div>
      )}

      {/* Error */}
      {error && !isLoading && (
        <div style={{ padding: 14, background: '#FCEBEB', color: '#A32D2D', borderRadius: 10, fontSize: 13, marginTop: 8 }}>
          {String(error)}
        </div>
      )}

      {/* Player card */}
      {stats && !isLoading && <PlayerCard stats={stats} />}
    </div>
  )
}
