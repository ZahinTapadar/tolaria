import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
  editorName: string
}

interface State {
  hasError: boolean
  error: Error | null
}

export class EditorErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[EditorErrorBoundary:${this.props.editorName}]`, error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col h-full items-center justify-center p-8 bg-destructive/10">
          <h3 className="text-lg font-semibold text-destructive mb-2">
            {this.props.editorName} Editor Error
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            The editor crashed. Check the console for details.
          </p>
          <pre className="text-xs bg-card p-4 rounded max-w-full overflow-auto">
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Retry
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
