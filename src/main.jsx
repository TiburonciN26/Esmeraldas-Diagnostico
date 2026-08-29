import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SessionProvider } from './context/SessionContext'
import { AppProvider } from './context/AppContext'
import { ConfirmProvider } from './context/ConfirmContext'
import { ToastProvider } from './context/ToastContext'
import LoginGate from './components/auth/LoginGate'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import { aplicarTemaInicial } from './utils/theme'
import './index.css'

// Antes de montar React: un efecto correría recién DESPUÉS del primer
// paint, mostrando un flash del tema equivocado si el guardado (o el del
// sistema) es oscuro.
aplicarTemaInicial()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <SessionProvider>
        <LoginGate>
          <ConfirmProvider>
            <ToastProvider>
              <AppProvider>
                <App />
              </AppProvider>
            </ToastProvider>
          </ConfirmProvider>
        </LoginGate>
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>
)
