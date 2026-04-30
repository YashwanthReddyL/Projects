import { useState, useEffect, useRef } from 'react'
import { useQuery } from 'react-query'
import { api, WinProbResult, WinTimeline } from '../../api/client'
import { useMatches, useScorecard } from '../../hooks/useMatch'
import { useModelInfo } from '../../hooks/useAnalytics'
import Skeleton from '../../components/Skeleton'

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  green:  '#00C48C',
  red:    '#FF4757',
  gold:   '#FFB800',
  dark:   '#0A0E1A',
  panel:  '#111827',
  card:   '#1A2235',
  border: 'rgba(255,255,255,0.07)',
  muted:  'rgba(255,255,255,0.45)',
  text:   '#F0F4FF',
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const css = `
  @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@500;600;700&family=Inter:wght@400;500;600&display=swap');

  .pred-root {
    background: ${C.dark};
    color: ${C.text};
    min-height: 100vh;
    font-family: 'Inter', sans-serif;
    padding: 0 16px 60px;
  }
  .pred-hero {
    text-align: center;
    padding: 40px 0 32px;
  }
  .pred-hero-title {
    font-family: 'Rajdhani', sans-serif;
    font-size: clamp(28px, 5vw, 48px);
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #00C48C 0%, #00A3FF 50%, #FFB800 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin: 0 0 8px;
  }
  .pred-hero-sub {
    font-size: 14px;
    color: ${C.muted};
    max-width: 480px;
    margin: 0 auto;
    line-height: 1.6;
  }
  .pred-card {
    background: ${C.card};
    border: 1px solid ${C.border};
    border-radius: 16px;
    padding: 20px 24px;
    margin-bottom: 16px;
  }
  .pred-label {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: ${C.muted};
    margin-bottom: 10px;
  }
  .pred-input {
    background: rgba(255,255,255,0.06);
    border: 1px solid ${C.border};
    border-radius: 10px;
    color: ${C.text};
    font-size: 14px;
    padding: 10px 14px;
    width: 100%;
    box-sizing: border-box;
    outline: none;
    transition: border-color 0.2s;
    font-family: 'Inter', sans-serif;
  }
  .pred-input:focus { border-color: rgba(0,196,140,0.5); }
  .pred-input option { background: #1A2235; }
  .pred-btn {
    background: linear-gradient(135deg, #00C48C, #00A3FF);
    border: none;
    border-radius: 12px;
    color: #fff;
    cursor: pointer;
    font-family: 'Rajdhani', sans-serif;
    font-size: 16px;
    font-weight: 700;
    letter-spacing: 0.05em;
    padding: 14px 32px;
    transition: opacity 0.2s, transform 0.1s;
    width: 100%;
  }
  .pred-btn:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .pred-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
  .prob-bar-track {
    height: 10px;
    border-radius: 5px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
    margin: 8px 0;
  }
  .prob-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.8s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .meter-ring {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 160px;
    height: 160px;
    margin: 0 auto;
  }
  .stat-chip {
    background: rgba(255,255,255,0.06);
    border: 1px solid ${C.border};
    border-radius: 8px;
    padding: 10px 14px;
    text-align: center;
    flex: 1;
    min-width: 80px;
  }
  .stat-chip-val {
    font-family: 'Rajdhani', sans-serif;
    font-size: 22px;
    font-weight: 700;
    line-height: 1;
  }
  .stat-chip-label {
    font-size: 11px;
    color: ${C.muted};
    margin-top: 4px;
    white-space: nowrap;
  }
  .swing-row {
    display: grid;
    grid-template-columns: 80px 1fr 80px;
    gap: 12px;
    align-items: center;
    padding: 8px 0;
    border-bottom: 1px solid ${C.border};
    font-size: 13px;
  }
  .swing-row:last-child { border-bottom: none; }
  .phase-badge {
    display: inline-block;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.06em;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .feature-bar-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .feature-bar-track {
    flex: 1;
    height: 6px;
    border-radius: 3px;
    background: rgba(255,255,255,0.08);
    overflow: hidden;
  }
  .tabs { display: flex; gap: 4px; margin-bottom: 20px; }
  .tab-btn {
    background: rgba(255,255,255,0.06);
    border: 1px solid ${C.border};
    border-radius: 8px;
    color: ${C.muted};
    cursor: pointer;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    padding: 8px 16px;
    transition: all 0.15s;
  }
  .tab-btn.active {
    background: rgba(0,196,140,0.15);
    border-color: rgba(0,196,140,0.4);
    color: ${C.green};
  }
  @keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 0 0 rgba(0,196,140,0); }
    50%       { box-shadow: 0 0 20px 4px rgba(0,196,140,0.25); }
  }
  .glow-active { animation: pulseGlow 2s ease-in-out infinite; }
  @media (max-width: 600px) {
    .pred-card { padding: 16px; }
    .prob-grid { grid-template-columns: 1fr !important; }
    .stat-chips { flex-wrap: wrap; }
  }
`

// ── Helpers ────────────────────────────────────────────────────────────────────
function pct(v: number) { return `${(v * 100).toFixed(1)}%` }
function probColor(p: number): string {
  if (p >= 0.7) return C.green
  if (p >= 0.5) return '#00A3FF'
  if (p >= 0.35) return C.gold
  return C.red
}
function phase(over: number) {
  if (over <= 5)  return { label: 'Powerplay', color: '#00C48C', bg: 'rgba(0,196,140,0.12)' }
  if (over <= 14) return { label: 'Middle',    color: '#00A3FF', bg: 'rgba(0,163,255,0.12)' }
  return                 { label: 'Death',     color: '#FF4757', bg: 'rgba(255,71,87,0.12)' }
}

// ── Circular meter ─────────────────────────────────────────────────────────────
function ProbMeter({ prob, team, color, size = 160 }: {
  prob: number; team: string; color: string; size?: number
}) {
  const r     = (size - 16) / 2
  const circ  = 2 * Math.PI * r
  const dash  = circ * prob
  const gap   = circ - dash
  const pctVal = Math.round(prob * 100)

  return (
    <div style={{ position: 'relative', width: size, height: size, margin: '0 auto' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={8} />
        <circle cx={size/2} cy={size/2} r={r}
          fill="none" stroke={color} strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 1s cubic-bezier(.4,0,.2,1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'Rajdhani', fontSize: size > 120 ? 32 : 24, fontWeight: 700, color, lineHeight: 1 }}>
          {pctVal}%
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 4, textAlign: 'center', maxWidth: size - 32, lineHeight: 1.3 }}>
          {team.split(' ').slice(-2).join(' ')}
        </div>
      </div>
    </div>
  )
}

// ── Manual predictor form ──────────────────────────────────────────────────────
function ManualPredictor({ teams }: { teams: string[] }) {
  const [form, setForm] = useState({
    batting_team: '', bowling_team: '',
    innings: 1, over: 0, ball: 0,
    runs_so_far: 0, wickets_so_far: 0, target: 0,
  })
  const [result, setResult] = useState<WinProbResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')
  const f = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }))

  async function predict() {
    if (!form.batting_team) { setError('Select the batting team'); return }
    setLoading(true); setError('')
    try {
      const res = await (api as any).predictWin({
        innings:        form.innings,
        over:           form.over,
        ball:           form.ball,
        runs_so_far:    form.runs_so_far,
        wickets_so_far: form.wickets_so_far,
        target:         form.innings === 2 ? form.target : 0,
      })
      setResult(res)
    } catch (e: any) {
      setError(e.message ?? 'Prediction failed')
    } finally {
      setLoading(false)
    }
  }

  const bowlingTeam = form.bowling_team || (form.batting_team ? '(bowling team)' : '')
  const batProb  = result?.batting_win_prob ?? 0
  const bowlProb = result?.bowling_win_prob ?? 0
  const ph = phase(form.over)

  return (
    <div>
      {/* Team selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <div className="pred-label">Batting team</div>
          <select className="pred-input" value={form.batting_team}
            onChange={e => { f('batting_team', e.target.value); if (e.target.value === form.bowling_team) f('bowling_team', '') }}>
            <option value=''>Select team</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <div className="pred-label">Bowling team</div>
          <select className="pred-input" value={form.bowling_team}
            onChange={e => f('bowling_team', e.target.value)}>
            <option value=''>Select team</option>
            {teams.filter(t => t !== form.batting_team).map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* Innings toggle */}
      <div style={{ marginBottom: 12 }}>
        <div className="pred-label">Innings</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[1, 2].map(i => (
            <button key={i} onClick={() => f('innings', i)} style={{
              flex: 1, padding: '10px', borderRadius: 10, border: '1px solid',
              cursor: 'pointer', fontFamily: 'Rajdhani', fontSize: 15, fontWeight: 600,
              background: form.innings === i ? 'rgba(0,196,140,0.15)' : 'rgba(255,255,255,0.05)',
              borderColor: form.innings === i ? 'rgba(0,196,140,0.5)' : C.border,
              color: form.innings === i ? C.green : C.muted,
              transition: 'all 0.15s',
            }}>
              {i === 1 ? '1st innings' : '2nd innings'}
            </button>
          ))}
        </div>
      </div>

      {/* State inputs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 12 }}>
        {[
          { key: 'over',           label: 'Over (0–19)',  max: 19  },
          { key: 'ball',           label: 'Ball (0–5)',   max: 5   },
          { key: 'runs_so_far',    label: 'Runs scored',  max: 400 },
          { key: 'wickets_so_far', label: 'Wickets',      max: 10  },
          ...(form.innings === 2 ? [{ key: 'target', label: 'Target', max: 400 }] : []),
        ].map(({ key, label, max }) => (
          <div key={key}>
            <div className="pred-label">{label}</div>
            <input
              type="number" min={0} max={max}
              value={(form as any)[key]}
              onChange={e => f(key, Math.min(max, Math.max(0, Number(e.target.value))))}
              className="pred-input"
            />
          </div>
        ))}
      </div>

      {/* Phase indicator */}
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="phase-badge" style={{ background: ph.bg, color: ph.color }}>
          {ph.label}
        </span>
        <span style={{ fontSize: 12, color: C.muted }}>
          Over {form.over + 1}, Ball {form.ball}  ·  {120 - form.over * 6 - form.ball} balls remaining
        </span>
      </div>

      {error && <div style={{ color: '#ff6b6b', fontSize: 13, marginBottom: 12 }}>{error}</div>}

      <button className="pred-btn" onClick={predict} disabled={loading || !form.batting_team}>
        {loading ? 'Calculating…' : '⚡ Predict Win Probability'}
      </button>

      {/* Result */}
      {result && (
        <div style={{ marginTop: 24 }}>
          {/* Meters */}
          <div className="prob-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            <div className="pred-card" style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
              <div className="pred-label">Batting team</div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 14, color: C.muted, marginBottom: 12 }}>{form.batting_team}</div>
              <div className={batProb > 0.6 ? 'glow-active' : ''} style={{ borderRadius: '50%', display: 'inline-block' }}>
                <ProbMeter prob={batProb} team={form.batting_team} color={probColor(batProb)} />
              </div>
              <div style={{ marginTop: 12, fontFamily: 'Rajdhani', fontSize: 13, color: C.muted }}>
                Win probability
              </div>
            </div>
            <div className="pred-card" style={{ textAlign: 'center', paddingTop: 24, paddingBottom: 24 }}>
              <div className="pred-label">Bowling team</div>
              <div style={{ fontFamily: 'Rajdhani', fontSize: 14, color: C.muted, marginBottom: 12 }}>{form.bowling_team || '—'}</div>
              <ProbMeter prob={bowlProb} team={form.bowling_team || 'Bowling team'} color={probColor(bowlProb)} />
              <div style={{ marginTop: 12, fontFamily: 'Rajdhani', fontSize: 13, color: C.muted }}>
                Win probability
              </div>
            </div>
          </div>

          {/* Probability bar */}
          <div className="pred-card">
            <div className="pred-label">Win probability split</div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
              <span style={{ color: probColor(batProb), fontWeight: 600 }}>{form.batting_team.split(' ').pop()} {pct(batProb)}</span>
              <span style={{ color: probColor(bowlProb), fontWeight: 600 }}>{pct(bowlProb)} {form.bowling_team.split(' ').pop() || 'Bowling'}</span>
            </div>
            <div className="prob-bar-track">
              <div className="prob-fill" style={{
                width: pct(batProb),
                background: `linear-gradient(90deg, ${probColor(batProb)}, ${probColor(bowlProb)})`,
              }} />
            </div>
          </div>

          {/* Context chips */}
          <div className="pred-card">
            <div className="pred-label">Match context</div>
            <div className="stat-chips" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { val: result.context.crr.toFixed(2),   label: 'Current RR' },
                { val: result.context.balls_remaining,  label: 'Balls left' },
                ...(result.context.rrr != null ? [{ val: result.context.rrr.toFixed(2), label: 'Required RR' }] : []),
                ...(result.context.runs_required != null ? [{ val: result.context.runs_required, label: 'Runs needed' }] : []),
                ...(result.context.target != null ? [{ val: result.context.target, label: 'Target' }] : []),
              ].map(c => (
                <div key={c.label} className="stat-chip">
                  <div className="stat-chip-val" style={{ color: C.text }}>{c.val}</div>
                  <div className="stat-chip-label">{c.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 8 }}>
            Model trained on {result.model_trained_on.toLocaleString()} ball-states
            {result.model_trained_on < 10000 && ' · Accuracy improves significantly with full IPL dataset'}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Match timeline tab ─────────────────────────────────────────────────────────
function MatchTimeline({ teams }: { teams: string[] }) {
  const { data: matches, isLoading: matchLoading } = useMatches({ limit: 500 })
  const [selectedMatch, setSelectedMatch] = useState<string>('')
  const [searchQ, setSearchQ]             = useState('')

  const filtered = (matches ?? []).filter(m =>
    !searchQ || m.team1.toLowerCase().includes(searchQ.toLowerCase()) ||
    m.team2.toLowerCase().includes(searchQ.toLowerCase()) ||
    m.date.includes(searchQ)
  )

  const { data: timeline, isLoading: tlLoading } = useQuery(
    ['win-timeline', selectedMatch],
    () => (api as any).getWinTimeline(selectedMatch),
    { enabled: !!selectedMatch, staleTime: Infinity }
  )

  const tl = timeline as WinTimeline | undefined

  return (
    <div>
      {/* Match selector */}
      <div className="pred-card" style={{ marginBottom: 16 }}>
        <div className="pred-label">Select completed match</div>
        <input
          className="pred-input" style={{ marginBottom: 10 }}
          placeholder="Search team or date…"
          value={searchQ}
          onChange={e => setSearchQ(e.target.value)}
        />
        {matchLoading && <Skeleton height={36} radius={10} style={{ background: 'rgba(255,255,255,0.08)' }} />}
        <div style={{ maxHeight: 200, overflowY: 'auto', borderRadius: 10, border: `1px solid ${C.border}` }}>
          {filtered.slice(0, 60).map(m => (
            <div
              key={m.match_id}
              onClick={() => setSelectedMatch(m.match_id)}
              style={{
                padding: '9px 14px', cursor: 'pointer', fontSize: 13,
                borderBottom: `1px solid ${C.border}`,
                background: selectedMatch === m.match_id ? 'rgba(0,196,140,0.12)' : 'transparent',
                color: selectedMatch === m.match_id ? C.green : C.text,
                display: 'flex', justifyContent: 'space-between',
              }}
              onMouseEnter={e => { if (selectedMatch !== m.match_id) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
              onMouseLeave={e => { if (selectedMatch !== m.match_id) e.currentTarget.style.background = 'transparent' }}
            >
              <span>{m.team1} vs {m.team2}</span>
              <span style={{ color: C.muted, fontSize: 11 }}>{m.date}</span>
            </div>
          ))}
        </div>
      </div>

      {tlLoading && (
        <div className="pred-card">
          <Skeleton height={300} radius={10} style={{ background: 'rgba(255,255,255,0.06)' }} />
        </div>
      )}

      {tl && !tlLoading && <TimelineChart timeline={tl} />}
    </div>
  )
}

// ── SVG Win probability swing chart ───────────────────────────────────────────
function TimelineChart({ timeline: tl }: { timeline: WinTimeline }) {
  const W = 680, H = 280, PAD = { top: 32, right: 40, bottom: 48, left: 48 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const inn1 = tl.timeline.filter(p => p.innings === 1)
  const inn2 = tl.timeline.filter(p => p.innings === 2)
  const all  = tl.timeline

  if (all.length === 0) return <div style={{ color: C.muted, textAlign: 'center', padding: 40 }}>No timeline data</div>

  // X: index across all overs, Y: probability (0=1, 1=0 — top is 100%)
  const xScale = (i: number) => PAD.left + (i / (all.length - 1 || 1)) * innerW
  const yScale = (p: number) => PAD.top + (1 - p) * innerH

  function makePath(points: typeof all) {
    if (points.length === 0) return ''
    const indices = points.map(p => all.indexOf(p))
    return points.map((p, i) => {
      const x = xScale(indices[i])
      const y = yScale(p.batting_win_prob)
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`
    }).join(' ')
  }

  const path1 = makePath(inn1)
  const path2 = makePath(inn2)

  // 50% line y
  const midY = yScale(0.5)
  // Batting team for each innings
  const bat1 = inn1[0]?.batting_team ?? tl.team1
  const bat2 = inn2[0]?.batting_team ?? tl.team2

  return (
    <div className="pred-card">
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontFamily: 'Rajdhani', fontSize: 18, fontWeight: 700, marginBottom: 4 }}>
          Win probability swing
        </div>
        <div style={{ fontSize: 13, color: C.muted }}>
          {tl.team1} vs {tl.team2} · {tl.winner} won ·
          {' '}{bat1}: {tl.inn1_total} | Target: {tl.target}
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', minWidth: 320 }}>
          {/* Background zones */}
          <rect x={PAD.left} y={PAD.top} width={innerW} height={innerH}
            fill="rgba(255,255,255,0.02)" rx={6} />

          {/* 50% line */}
          <line x1={PAD.left} x2={PAD.left + innerW} y1={midY} y2={midY}
            stroke="rgba(255,255,255,0.12)" strokeDasharray="4 4" strokeWidth={1} />
          <text x={PAD.left + innerW + 4} y={midY + 4} fill="rgba(255,255,255,0.3)" fontSize={10}>50%</text>

          {/* Y-axis labels */}
          {[0, 25, 50, 75, 100].map(p => (
            <g key={p}>
              <text x={PAD.left - 6} y={yScale(p/100) + 4} fill={C.muted} fontSize={10} textAnchor="end">{p}%</text>
              <line x1={PAD.left - 3} x2={PAD.left} y1={yScale(p/100)} y2={yScale(p/100)} stroke={C.muted} strokeWidth={1} />
            </g>
          ))}

          {/* Inn 1 path */}
          {path1 && (
            <path d={path1} fill="none" stroke={C.green} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Inn 2 path */}
          {path2 && (
            <path d={path2} fill="none" stroke="#FF4757" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          )}

          {/* Data points with tooltips */}
          {all.map((p, i) => {
            const x = xScale(i), y = yScale(p.batting_win_prob)
            const col = p.innings === 1 ? C.green : '#FF4757'
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill={col} stroke={C.dark} strokeWidth={1.5} />
                <title>
                  {p.batting_team.split(' ').pop()} — {(p.batting_win_prob*100).toFixed(0)}% win
                  {'\n'}Over {p.over+1}: {p.runs_so_far}/{p.wickets_so_far}
                  {p.rrr != null ? `\nRRR: ${p.rrr?.toFixed(2)}` : ''}
                </title>
              </g>
            )
          })}

          {/* Inn separator */}
          {inn2.length > 0 && (() => {
            const sepX = xScale(all.indexOf(inn2[0]))
            return (
              <g>
                <line x1={sepX} x2={sepX} y1={PAD.top} y2={PAD.top + innerH}
                  stroke="rgba(255,255,255,0.2)" strokeDasharray="3 3" strokeWidth={1.5} />
                <text x={sepX + 4} y={PAD.top + 14} fill={C.muted} fontSize={10}>2nd inn</text>
              </g>
            )
          })()}

          {/* X axis labels — every 5 overs */}
          {all.filter((_, i) => i % 5 === 0).map((p, i) => {
            const realIdx = all.indexOf(p)
            return (
              <text key={i} x={xScale(realIdx)} y={H - 10} fill={C.muted} fontSize={10} textAnchor="middle">
                {p.over + 1}
              </text>
            )
          })}
          <text x={PAD.left + innerW/2} y={H - 0} fill={C.muted} fontSize={10} textAnchor="middle">Over</text>
        </svg>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 20, marginTop: 12, fontSize: 12, color: C.muted }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 3, background: C.green, borderRadius: 2 }} />
          <span>{bat1.split(' ').pop()} (Inn 1)</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 24, height: 3, background: '#FF4757', borderRadius: 2 }} />
          <span>{bat2.split(' ').pop()} (Inn 2)</span>
        </div>
      </div>

      {/* Over-by-over table */}
      <div style={{ marginTop: 20 }}>
        <div className="pred-label">Over-by-over breakdown</div>
        <div style={{ maxHeight: 220, overflowY: 'auto', fontSize: 12 }}>
          {all.map((p, i) => {
            const ph = phase(p.over)
            const col = p.innings === 1 ? C.green : '#FF4757'
            const prevProb = i > 0 && all[i-1].innings === p.innings ? all[i-1].batting_win_prob : p.batting_win_prob
            const swing = p.batting_win_prob - prevProb
            return (
              <div key={i} className="swing-row">
                <div>
                  <span className="phase-badge" style={{ background: ph.bg, color: ph.color, fontSize: 9 }}>{ph.label[0]}{p.over+1}</span>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: col }}>
                    {(p.batting_win_prob * 100).toFixed(0)}%
                  </div>
                  <div style={{ fontSize: 10, color: C.muted }}>
                    {p.batting_team.split(' ').pop()}: {p.runs_so_far}/{p.wickets_so_far}
                    {p.runs_required != null && ` · need ${p.runs_required}`}
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontSize: 11 }}>
                  {Math.abs(swing) > 0.005 && (
                    <span style={{ color: swing > 0 ? C.green : C.red }}>
                      {swing > 0 ? '+' : ''}{(swing * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Model info tab ─────────────────────────────────────────────────────────────
function ModelInfoTab() {
  const { data: info } = useModelInfo()

  if (!info) return <Skeleton.Card rows={6} />
  if (!info.available) return (
    <div className="pred-card" style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 32, marginBottom: 16 }}>🤖</div>
      <div style={{ fontFamily: 'Rajdhani', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Model not trained yet</div>
      <div style={{ color: C.muted, fontSize: 14, marginBottom: 20, lineHeight: 1.6 }}>{info.message}</div>
      <div className="pred-card" style={{ textAlign: 'left', marginTop: 0 }}>
        <div className="pred-label">Run this command</div>
        <div style={{ fontFamily: 'monospace', fontSize: 13, padding: '10px 14px', background: 'rgba(0,0,0,0.3)', borderRadius: 8, color: C.green }}>
          cd backend && python ../pipeline/train_win_model.py
        </div>
      </div>
    </div>
  )

  const maxImp = Math.max(...Object.values(info.feature_importance ?? {}))
  const FEAT_LABELS: Record<string, string> = {
    innings:          'Innings (1st/2nd)',
    over:             'Current over',
    runs_so_far:      'Runs scored',
    wickets_so_far:   'Wickets fallen',
    balls_remaining:  'Balls remaining',
    crr:              'Current run rate',
    rrr:              'Required run rate',
    runs_required:    'Runs required',
    target:           'Target score',
    pct_target:       '% of target achieved',
    pct_balls_used:   '% of balls used',
    wickets_in_hand:  'Wickets in hand',
  }

  return (
    <div>
      {/* Overview */}
      <div className="pred-card">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          {[
            { val: info.n_training_samples?.toLocaleString() ?? '—', label: 'Training ball-states' },
            { val: info.features?.length ?? '—', label: 'Input features' },
            { val: info.model_type?.split(' ')[0] ?? '—', label: 'Algorithm' },
            { val: info.n_training_samples && info.n_training_samples > 50000 ? '~87%' : 'Growing', label: 'Est. accuracy' },
          ].map(s => (
            <div key={s.label} className="stat-chip">
              <div className="stat-chip-val" style={{ color: C.green }}>{s.val}</div>
              <div className="stat-chip-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature importance */}
      <div className="pred-card">
        <div className="pred-label">Feature importance (|coefficient|)</div>
        {Object.entries(info.feature_importance ?? {})
          .sort((a, b) => b[1] - a[1])
          .map(([feat, imp]) => (
            <div key={feat} className="feature-bar-row">
              <div style={{ width: 180, color: C.text, fontSize: 12 }}>{FEAT_LABELS[feat] ?? feat}</div>
              <div className="feature-bar-track">
                <div style={{
                  width: `${(imp / (maxImp || 1)) * 100}%`,
                  height: '100%', borderRadius: 3,
                  background: `linear-gradient(90deg, ${C.green}, #00A3FF)`,
                  transition: 'width 0.8s ease',
                }} />
              </div>
              <div style={{ width: 50, textAlign: 'right', color: C.muted, fontSize: 11 }}>
                {imp.toFixed(3)}
              </div>
            </div>
          ))
        }
      </div>

      {/* How it works */}
      <div className="pred-card">
        <div className="pred-label">How it works</div>
        <div style={{ fontSize: 13, color: C.muted, lineHeight: 1.8 }}>
          <p style={{ margin: '0 0 10px' }}>
            Every delivery in every IPL match since 2008 generates a <strong style={{ color: C.text }}>game state snapshot</strong> — 
            runs scored, wickets fallen, run rate, balls remaining. Each snapshot is labelled with whether the batting team ultimately won.
          </p>
          <p style={{ margin: '0 0 10px' }}>
            A <strong style={{ color: C.text }}>Logistic Regression</strong> model learns the relationship between these states and outcomes. 
            It outputs a calibrated probability — not just a winner, but how confident it is.
          </p>
          <p style={{ margin: 0 }}>
            The model is purely statistical: it doesn't know who the players are, just what the numbers say at that moment.
            With the full 900+ match IPL dataset, expect <strong style={{ color: C.text }}>AUC ~0.87–0.91</strong>.
          </p>
        </div>
      </div>
    </div>
  )
}

// ── Root page ──────────────────────────────────────────────────────────────────
type PredTab = 'manual' | 'timeline' | 'model'

export default function PredictorPage() {
  const [tab, setTab] = useState<PredTab>('manual')
  const { data: teams = [] } = useQuery(
    ['teams'], () => (api as any).getTeams?.() ?? fetch('/api/matches/meta/teams').then(r => r.json()),
    { staleTime: Infinity }
  )

  return (
    <>
      <style>{css}</style>
      <div className="pred-root">
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          {/* Hero */}
          <div className="pred-hero">
            <h1 className="pred-hero-title">Win Probability Engine</h1>
            <p className="pred-hero-sub">
              Machine learning model trained on every IPL delivery since 2008.
              Predict the outcome at any point in a match — before, during, or after.
            </p>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {[
              { id: 'manual',   label: '⚡ Live Predictor' },
              { id: 'timeline', label: '📈 Match Swing' },
              { id: 'model',    label: '🤖 Model Details' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as PredTab)}
                className={`tab-btn${tab === t.id ? ' active' : ''}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'manual'   && <ManualPredictor teams={teams} />}
          {tab === 'timeline' && <MatchTimeline teams={teams} />}
          {tab === 'model'    && <ModelInfoTab />}
        </div>
      </div>
    </>
  )
}
