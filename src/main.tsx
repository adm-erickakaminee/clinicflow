import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { registerServiceWorker } from './pwa/registerServiceWorker'
import { SchedulerProvider } from './context/SchedulerContext'
import { ToastProvider } from './components/ui/Toast'
import { BrowserRouter } from 'react-router-dom'
import { ErrorBoundary } from './components/ErrorBoundary'

const rootElement = document.getElementById('root')
if (!rootElement) {
  throw new Error('Root element not found')
}

console.log('🚀 Iniciando aplicação...')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SchedulerProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SchedulerProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)

// Evita SW interferir no ambiente de desenvolvimento/HMR
if (import.meta.env.PROD) {
  registerServiceWorker()
} else {
  // Garante que qualquer SW antigo seja removido em dev
  navigator.serviceWorker
    ?.getRegistrations()
    .then((regs) => regs.forEach((r) => r.unregister()))
    .catch(() => {})
}
