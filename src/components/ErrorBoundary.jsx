import { Component } from 'react'
import Button from './ui/Button'

// Atrapa errores de render en cualquier parte del árbol y muestra un mensaje
// recuperable en vez de dejar la pantalla en blanco (los errores de render
// no muestran nada ni dejan rastro visible sin esto).
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Error de render no capturado:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page-error">
          <div className="page-error__emoji">⚠️</div>
          <p>Algo salió mal. Recargá la página para continuar.</p>
          <Button variant="ghost" onClick={() => window.location.reload()}>
            Recargar
          </Button>
        </div>
      )
    }
    return this.props.children
  }
}
