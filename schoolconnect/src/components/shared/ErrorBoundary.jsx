import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #f8fafc)',
          fontFamily: 'var(--font, "Plus Jakarta Sans", sans-serif)',
          padding: 32,
        }}>
          <div style={{
            maxWidth: 440,
            textAlign: 'center',
            background: 'var(--surface, #fff)',
            borderRadius: 20,
            padding: '48px 36px',
            boxShadow: '0 4px 24px rgba(0,0,0,.08)',
            border: '1px solid var(--border, #e5e7eb)',
          }}>
            <div style={{
              width: 64, height: 64,
              background: 'var(--accent-red-light, #fef2f2)',
              borderRadius: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              fontSize: 28,
            }}>
              ⚠️
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8, color: 'var(--text-primary, #1e293b)' }}>
              Something went wrong
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-secondary, #64748b)', lineHeight: 1.6, marginBottom: 24 }}>
              An unexpected error occurred. This has been logged. Please reload to continue.
            </p>
            {this.state.error && (
              <div style={{
                background: 'var(--surface-2, #f1f5f9)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 24,
                textAlign: 'left',
                fontSize: 12,
                color: 'var(--accent-red, #dc2626)',
                fontFamily: 'monospace',
                wordBreak: 'break-word',
                maxHeight: 120,
                overflow: 'auto',
              }}>
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={this.handleReload}
              style={{
                background: 'var(--brand, #1a3a6b)',
                color: 'white',
                border: 'none',
                borderRadius: 10,
                padding: '12px 32px',
                fontSize: 14,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
