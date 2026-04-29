import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="text-lg font-semibold text-text-primary mb-2">Something went wrong</div>
            <div className="text-sm text-text-muted mb-4">{this.state.error?.message || 'An unexpected error occurred.'}</div>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="bg-accent text-white px-5 py-2 rounded text-sm font-medium cursor-pointer hover:bg-[#e55a25] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
