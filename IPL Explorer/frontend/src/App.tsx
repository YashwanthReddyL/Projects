import { useState } from 'react'
import { QueryClient, QueryClientProvider } from 'react-query'
import DashboardPage  from './apps/dashboard/DashboardPage'
import PlayerPage     from './apps/players/PlayerPage'
import AnalyticsPage  from './apps/analytics/AnalyticsPage'
import PredictorPage  from './apps/predictor/PredictorPage'
import ErrorBoundary  from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } },
})

type Tab = 'dashboard' | 'players' | 'analytics' | 'predictor'

const TABS: { id: Tab; label: string; short: string; accent?: boolean }[] = [
  { id: 'dashboard',  label: 'Match Dashboard', short: 'Dashboard' },
  { id: 'players',    label: 'Players',          short: 'Players'   },
  { id: 'analytics',  label: 'Analytics',         short: 'Analytics' },
  { id: 'predictor',  label: '⚡ Win Predictor',  short: '⚡ Predict', accent: true },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const isPred = tab === 'predictor'

  return (
    <QueryClientProvider client={queryClient}>
      <style>{`
        * { box-sizing: border-box; }
        body {
          margin: 0;
          font-family: system-ui, -apple-system, sans-serif;
          background: ${isPred ? '#0A0E1A' : '#f5f5f5'};
          transition: background 0.3s;
        }
        .nav-btn {
          padding: 14px 16px; border: none; background: none; cursor: pointer;
          font-size: 14px; white-space: nowrap; transition: all 0.15s;
          border-bottom: 2px solid transparent;
        }
        .nav-btn.active { font-weight: 500; }
        .nav-btn.active.pred { color: #00C48C; border-bottom-color: #00C48C; }
        .nav-btn.active:not(.pred) { color: #1D9E75; border-bottom-color: #1D9E75; }
        .nav-btn:not(.active) { color: ${isPred ? 'rgba(255,255,255,0.5)' : '#555'}; }
        .nav-btn:hover:not(.active) { color: ${isPred ? '#fff' : '#1D9E75'}; }
        .nav-btn.accent-btn:not(.active) {
          color: #00C48C;
          font-weight: 500;
        }
        @media (max-width: 540px) {
          .nav-label-full { display: none; }
          .nav-btn { padding: 12px 9px; font-size: 12px; }
          .app-logo { font-size: 14px !important; }
        }
        @media (min-width: 541px) { .nav-label-short { display: none; } }
      `}</style>

      <div style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div style={{
          background: isPred ? '#111827' : '#fff',
          borderBottom: `1px solid ${isPred ? 'rgba(255,255,255,0.08)' : '#eee'}`,
          padding: '0 16px',
          position: 'sticky', top: 0, zIndex: 100,
          transition: 'background 0.3s, border-color 0.3s',
        }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="app-logo" style={{
              padding: '14px 0', fontWeight: 700, fontSize: 16,
              color: '#1D9E75', whiteSpace: 'nowrap', letterSpacing: '-0.02em', flexShrink: 0,
            }}>
              IPL Explorer
            </div>
            <nav style={{ display: 'flex', gap: 2, overflowX: 'auto', flexShrink: 1 }}>
              {TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={[
                    'nav-btn',
                    tab === t.id ? 'active' : '',
                    tab === t.id && t.id === 'predictor' ? 'pred' : '',
                    t.accent ? 'accent-btn' : '',
                  ].filter(Boolean).join(' ')}
                >
                  <span className="nav-label-full">{t.label}</span>
                  <span className="nav-label-short">{t.short}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <ErrorBoundary>
          {tab === 'dashboard'  && <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 0 0' }}><DashboardPage /></div>}
          {tab === 'players'    && <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 0 0' }}><PlayerPage /></div>}
          {tab === 'analytics'  && <div style={{ maxWidth: 1200, margin: '0 auto', padding: '16px 0 0' }}><AnalyticsPage /></div>}
          {tab === 'predictor'  && <PredictorPage />}
        </ErrorBoundary>
      </div>
    </QueryClientProvider>
  )
}
