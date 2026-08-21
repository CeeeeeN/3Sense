import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 2. Create the client (The global cache brain)
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data is considered "fresh" for 5 minutes. 
      // If a user leaves a tab and comes back within 5 mins, 0 database reads are used.
      staleTime: 1000 * 60 * 5, 
      // Keep inactive data in memory for 30 minutes before garbage collecting
      gcTime: 1000 * 60 * 30,
      // Don't automatically refetch when the user clicks away and clicks back to the window
      refetchOnWindowFocus: false, 
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </StrictMode>,
)
