import { useState } from 'react'
import { useAllVenueStats } from '../../hooks/useAnalytics'
import { useSeasons } from '../../hooks/useMatch'
import { VenueStats } from '../../api/client'
import Skeleton from '../../components/Skeleton'
import { useDebounce } from '../../hooks/useDebounce'

export default function VenuesView() {
  const { data: seasons } = useSeasons()
  const [season,  setSeason]  = useState('')
  const [sort,    setSort]    = useState<keyof VenueStats>('matches')
  const [search,  setSearch]  = useState('')
  const debouncedSearch = useDebounce(search, 250)

  const { data, isLoading } = useAllVenueStats(season || undefined)

  const filtered = (data ?? [])
    .filter(v =>
      v.venue.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      v.city.toLowerCase().includes(debouncedSearch.toLowerCase())
    )
    .sort((a, b) => (b[sort] as number) - (a[sort] as number))

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder='Search venue or city…'
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, flex: 1, minWidth: 160 }}
        />
        <select
          value={season}
          onChange={e => setSeason(e.target.value)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
        >
          <option value=''>All seasons</option>
          {seasons?.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as keyof VenueStats)}
          style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13 }}
        >
          <option value='matches'>Most matches</option>
          <option value='avg_first_innings_score'>Highest avg 1st inn</option>
          <option value='highest_total'>Highest total</option>
          <option value='bat_first_wins'>Bat-first wins</option>
        </select>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={120} radius={12} />)}
        </div>
      )}

      {!isLoading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa', fontSize: 14 }}>
          {data?.length === 0 ? 'No venue data available.' : 'No venues match your search.'}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {filtered.map(v => <VenueCard key={v.venue} venue={v} />)}
      </div>
    </div>
  )
}

function VenueCard({ venue: v }: { venue: VenueStats }) {
  const batPct   = v.matches > 0 ? Math.round((v.bat_first_wins / v.matches) * 100) : 0
  const fieldPct = 100 - batPct

  return (
    <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: '16px 20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 14, color: '#1a1a1a' }}>{v.venue}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{v.city} · {v.matches} matches</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', lineHeight: 1 }}>{v.highest_total}</div>
          <div style={{ fontSize: 11, color: '#aaa' }}>highest total</div>
        </div>
      </div>

      {/* Avg scores grid — responsive */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(90px, 1fr))', gap: 10, marginBottom: 12 }}>
        {[
          { label: 'Avg 1st inn', value: v.avg_first_innings_score.toFixed(0) },
          { label: 'Avg 2nd inn', value: v.avg_second_innings_score.toFixed(0) },
          { label: 'Lowest 1st', value: v.lowest_total },
        ].map(s => (
          <div key={s.label} style={{ background: '#f8f8f8', borderRadius: 8, padding: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: '#333' }}>{s.value}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bat vs field bar */}
      <div style={{ fontSize: 11, color: '#aaa', marginBottom: 5 }}>Win % by toss decision</div>
      <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden' }}>
        {batPct > 0 && (
          <div style={{ width: `${batPct}%`, background: '#1D9E75', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 500 }}>
            {batPct > 15 && `Bat ${v.bat_first_wins}`}
          </div>
        )}
        {fieldPct > 0 && (
          <div style={{ flex: 1, background: '#378ADD', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 500 }}>
            {fieldPct > 15 && `Field ${v.field_first_wins}`}
          </div>
        )}
      </div>
    </div>
  )
}
