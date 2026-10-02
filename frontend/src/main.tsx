import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import '@fontsource/noto-sans/latin-400.css'
import '@fontsource/noto-sans/latin-500.css'
import '@fontsource/noto-sans/latin-600.css'
import '@fontsource/noto-sans/latin-700.css'
import '@fontsource/noto-sans/devanagari-400.css'
import '@fontsource/noto-sans/devanagari-500.css'
import '@fontsource/noto-sans/devanagari-600.css'
import '@fontsource/noto-sans/devanagari-700.css'
import '@fontsource/noto-serif/latin-400.css'
import '@fontsource/noto-serif/latin-600.css'
import '@fontsource/noto-serif/latin-700.css'
import './styles.css'
import './theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)

