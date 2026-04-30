import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js'
import { OverSummary } from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Filler)

interface Props {
  overs: OverSummary[]
  team1: string
  team2: string
}

export default function RunsChart({ overs, team1, team2 }: Props) {
  const inn1 = overs.filter(o => o.over >= 0  && o.over < 20)
  const inn2 = overs.filter(o => o.over >= 20 && o.over < 40)

  // Determine how many overs each innings actually lasted
  const inn1MaxOver = inn1.length > 0 ? Math.max(...inn1.map(o => o.over)) : 19
  const inn2MaxOver = inn2.length > 0 ? Math.max(...inn2.map(o => o.over - 20)) : 19
  const totalOvers  = Math.max(inn1MaxOver, inn2MaxOver) + 1

  // Build labels only up to the longest innings (no phantom empty overs)
  const labels = Array.from({ length: totalOvers }, (_, i) => `${i + 1}`)

  // Innings 2 cumulative offset — backend sends running total across both innings
  const inn2Offset = inn2.length > 0 ? inn2[0].cumulative_runs - inn2[0].runs : 0

  // Build per-over lookup maps
  const inn1Map = new Map(inn1.map(o => [o.over, o]))
  const inn2Map = new Map(inn2.map(o => [o.over - 20, o]))

  // Build cumulative data — carry forward last value for missing overs
  // (e.g. over 3 had only wides → it may still appear but if not, don't break the line)
  const inn1Data: (number | null)[] = []
  const inn2Data: (number | null)[] = []

  for (let i = 0; i < totalOvers; i++) {
    const o1 = inn1Map.get(i)
    inn1Data.push(o1 ? o1.cumulative_runs : null)

    const o2 = inn2Map.get(i)
    inn2Data.push(o2 ? o2.cumulative_runs - inn2Offset : null)
  }

  const data = {
    labels,
    datasets: [
      {
        label: team1,
        data: inn1Data,
        borderColor: '#1D9E75',
        backgroundColor: 'rgba(29,158,117,0.07)',
        tension: 0.3, fill: true,
        pointRadius: inn1Data.map(v => v !== null ? 3 : 0),
        pointHoverRadius: 5,
        spanGaps: false,  // line ends cleanly when innings ends
      },
      {
        label: team2,
        data: inn2Data,
        borderColor: '#D85A30',
        backgroundColor: 'rgba(216,90,48,0.07)',
        tension: 0.3, fill: true,
        pointRadius: inn2Data.map(v => v !== null ? 3 : 0),
        pointHoverRadius: 5,
        spanGaps: false,
      },
    ],
  }

  const options = {
    responsive: true,
    interaction: { mode: 'index' as const, intersect: false },
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          title: (items: any[]) => `Over ${items[0].label}`,
          label: (item: any) => {
            if (item.raw === null) return null
            const over = parseInt(item.label) - 1
            const isInn1 = item.datasetIndex === 0
            const ovrData = isInn1 ? inn1Map.get(over) : inn2Map.get(over)
            if (!ovrData) return `${item.dataset.label}: ${item.raw}`
            return `${item.dataset.label}: ${item.raw} (${ovrData.runs} this over${ovrData.wickets ? `, ${ovrData.wickets}W` : ''})`
          },
        },
        filter: (item: any) => item.raw !== null,
      },
    },
    scales: {
      y: { beginAtZero: true, title: { display: true, text: 'Cumulative runs' }, grid: { color: '#f5f5f5' } },
      x: { title: { display: true, text: 'Over' }, grid: { display: false } },
    },
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #eee' }}>
      <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px', color: '#333' }}>Run progression</div>
      <Line data={data as any} options={options} />
    </div>
  )
}
