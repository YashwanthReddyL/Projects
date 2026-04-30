import { Bar } from 'react-chartjs-2'
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Tooltip, Legend,
} from 'chart.js'
import { OverSummary } from '../../api/client'

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

interface Props {
  overs: OverSummary[]
  team1: string
  team2: string
}

export default function WicketsTimeline({ overs, team1, team2 }: Props) {
  const inn1 = overs.filter(o => o.over >= 0  && o.over < 20)
  const inn2 = overs.filter(o => o.over >= 20 && o.over < 40)

  // Only show as many overs as both innings combined actually used
  const inn1Max = inn1.length > 0 ? Math.max(...inn1.map(o => o.over)) : -1
  const inn2Max = inn2.length > 0 ? Math.max(...inn2.map(o => o.over - 20)) : -1
  const totalOvers = Math.max(inn1Max, inn2Max) + 1

  const labels = Array.from({ length: totalOvers }, (_, i) => `${i + 1}`)

  const inn1Map = new Map(inn1.map(o => [o.over, o]))
  const inn2Map = new Map(inn2.map(o => [o.over - 20, o]))

  const data = {
    labels,
    datasets: [
      {
        label: team1,
        data: labels.map((_, i) => inn1Map.get(i)?.wickets ?? 0),
        backgroundColor: 'rgba(29,158,117,0.75)',
        borderRadius: 3,
      },
      {
        label: team2,
        data: labels.map((_, i) => inn2Map.get(i)?.wickets ?? 0),
        backgroundColor: 'rgba(216,90,48,0.75)',
        borderRadius: 3,
      },
    ],
  }

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top' as const },
      tooltip: {
        callbacks: {
          title: (items: any[]) => `Over ${items[0].label}`,
          label: (item: any) => {
            const over = parseInt(item.label) - 1
            const isInn1 = item.datasetIndex === 0
            const ovrData = isInn1 ? inn1Map.get(over) : inn2Map.get(over)
            if (!ovrData) return `${item.dataset.label}: 0 wickets`
            return `${item.dataset.label}: ${item.raw}W (${ovrData.runs} runs)`
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 },
        title: { display: true, text: 'Wickets' },
        grid: { color: '#f5f5f5' },
      },
      x: { title: { display: true, text: 'Over' }, grid: { display: false } },
    },
  }

  return (
    <div style={{ background: '#fff', borderRadius: '12px', padding: '16px', border: '1px solid #eee' }}>
      <div style={{ fontWeight: 500, fontSize: '14px', marginBottom: '12px', color: '#333' }}>Wickets per over</div>
      <Bar data={data} options={options} />
    </div>
  )
}
