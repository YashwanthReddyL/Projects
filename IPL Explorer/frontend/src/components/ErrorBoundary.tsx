import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: string }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: '' }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error: error.message }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          margin: '32px 16px', padding: '20px',
          background: '#FCEBEB', border: '1px solid #f0b5b5',
          borderRadius: '10px', color: '#A32D2D',
        }}>
          <div style={{ fontWeight: 500, marginBottom: '6px' }}>Something went wrong</div>
          <div style={{ fontSize: '13px', opacity: 0.8 }}>{this.state.error}</div>
          <button
            onClick={() => this.setState({ hasError: false, error: '' })}
            style={{
              marginTop: '12px', padding: '6px 14px',
              background: '#A32D2D', color: '#fff',
              border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px',
            }}
          >
            Try again
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
