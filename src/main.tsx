import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { initializeApiClientWithAuth } from './api/client.ts'
import { useAuthStore } from './store/auth.ts'

const queryClient = new QueryClient()

initializeApiClientWithAuth({
  token: useAuthStore.getState().token,
  apiKey: useAuthStore.getState().apiKey,
})
useAuthStore.subscribe((state) => {
  initializeApiClientWithAuth({ token: state.token, apiKey: state.apiKey })
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
