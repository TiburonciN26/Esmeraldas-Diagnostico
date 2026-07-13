import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SessionProvider } from './context/SessionContext'
import { AppProvider } from './context/AppContext'
import { ConfirmProvider } from './context/ConfirmContext'
import LoginGate from './components/auth/LoginGate'
import ErrorBoundary from './components/ErrorBoundary'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <SessionProvider>
        <LoginGate>
          <ConfirmProvider>
            <AppProvider>
              <App />
            </AppProvider>
          </ConfirmProvider>
        </LoginGate>
      </SessionProvider>
    </ErrorBoundary>
  </StrictMode>
)
