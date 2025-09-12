import React from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import './index.css'
import App from './pages/App'

const root = createRoot(document.getElementById('root') as HTMLElement)
root.render(
  <HashRouter>
    <App />
  </HashRouter>
) 